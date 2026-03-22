<?php
/**
 * Shortcode: [guesty_bedrooms] — collapsible list of bedrooms and bed types from Guesty bedArrangements.
 *
 * Attributes:
 *   listing_id     — optional; defaults to #guesty-listing-id on the page (same as other shortcodes).
 *   include_shared — if "1" or "yes", includes SHARED_SPACE (e.g. living room sofa bed).
 *   title          — heading for the outer collapsible (default: Sleeping arrangements).
 *   expanded       — if "yes", outer panel starts open.
 *   min_width      — minimum column width in px for the responsive grid (default 260). Smaller = more columns.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Best URL for displaying a listing picture.
 *
 * @param array $pic Single picture object from API.
 */
function guesty_bedrooms_picture_display_url( $pic ) {
	if ( ! is_array( $pic ) ) {
		return '';
	}
	foreach ( array( 'large', 'regular', 'original', 'thumbnail' ) as $k ) {
		if ( ! empty( $pic[ $k ] ) && is_string( $pic[ $k ] ) ) {
			return $pic[ $k ];
		}
	}
	return '';
}

/**
 * Score how well a gallery caption matches a sleeping space name.
 *
 * @param string $room_name Guesty space name, e.g. "King Bedroom 3 w/Ensuite".
 * @param string $caption   Picture caption.
 */
function guesty_score_room_caption_match( $room_name, $caption ) {
	$caption = is_string( $caption ) ? trim( $caption ) : '';
	if ( $caption === '' ) {
		return 0;
	}
	$c = strtolower( $caption );
	$n = strtolower( $room_name );
	if ( strlen( $n ) > 4 && strpos( $c, $n ) !== false ) {
		return 100;
	}
	$score = 0;
	if ( preg_match( '/(?:bedroom|br\.?|room)\s*(?:#|number\s*|no\.?\s*)?(\d+)/i', $n, $m ) ) {
		$num = (int) $m[1];
		if ( $num > 0 && (
			preg_match( '/bedroom\s*' . $num . '\b/i', $c ) ||
			preg_match( '/\bbr\.?\s*' . $num . '\b/i', $c ) ||
			preg_match( '/bedroom\s+#?' . $num . '\b/i', $c ) ||
			preg_match( '/\b' . $num . '\s*(?:st|nd|rd|th)?\s+bedroom\b/i', $c ) ||
			preg_match( '/king\s+bedroom\s+' . $num . '\b/i', $c ) ||
			preg_match( '/queen\s+bedroom\s+' . $num . '\b/i', $c )
		) ) {
			$score = max( $score, 88 );
		}
	}
	if ( preg_match( '/primary|master|main/i', $n ) && preg_match( '/primary|master|main|principal/i', $c ) && ( strpos( $c, 'bed' ) !== false || strpos( $c, 'suite' ) !== false ) ) {
		$score = max( $score, 78 );
	}
	foreach ( array( 'bunk', 'sofa', 'casita', 'trundle', 'loft' ) as $kw ) {
		if ( strpos( $n, $kw ) !== false && strpos( $c, $kw ) !== false ) {
			$score = max( $score, 72 );
		}
	}
	$tokens = preg_split( '/\s+/', preg_replace( '/[^a-z0-9\s]/i', ' ', $n ) );
	foreach ( $tokens as $t ) {
		$t = trim( $t );
		if ( strlen( $t ) < 4 || in_array( $t, array( 'bedroom', 'with', 'suite', 'the', 'room' ), true ) ) {
			continue;
		}
		if ( strpos( $c, $t ) !== false ) {
			$score += 12;
		}
	}
	$score = min( 45, $score );
	if ( ( strpos( $c, 'bedroom' ) !== false || strpos( $c, 'suite' ) !== false ) && strpos( $c, 'bathroom' ) === false ) {
		$score = max( $score, 8 );
	}
	return $score;
}

/**
 * Assign one picture URL per room index (0-based) using captions; fallback to bedroom-themed unused photos.
 *
 * @param array<int,array> $rooms    Ordered bed arrangement rooms.
 * @param array<int,array> $pictures Listing pictures array.
 * @return array<int,string>         room_index => image URL.
 */
function guesty_assign_photos_to_bedrooms( $rooms, $pictures ) {
	$items = array();
	if ( is_array( $pictures ) ) {
		foreach ( $pictures as $j => $pic ) {
			$url = guesty_bedrooms_picture_display_url( $pic );
			if ( $url === '' ) {
				continue;
			}
			$cap = isset( $pic['caption'] ) ? (string) $pic['caption'] : '';
			$items[] = array(
				'url'     => esc_url_raw( $url ),
				'caption' => $cap,
				'used'    => false,
			);
		}
	}

	$n_rooms = count( $rooms );
	$assigned = array_fill( 0, $n_rooms, '' );

	foreach ( $rooms as $ri => $room ) {
		$name = isset( $room['name'] ) ? (string) $room['name'] : '';
		$best_score = 26;
		$best_j     = -1;
		foreach ( $items as $j => $it ) {
			if ( $it['used'] ) {
				continue;
			}
			$sc = guesty_score_room_caption_match( $name, $it['caption'] );
			if ( $sc > $best_score ) {
				$best_score = $sc;
				$best_j     = $j;
			}
		}
		if ( $best_j >= 0 ) {
			$items[ $best_j ]['used']         = true;
			$assigned[ (int) $ri ]            = $items[ $best_j ]['url'];
		}
	}

	$pool = array();
	foreach ( $items as $j => $it ) {
		if ( $it['used'] ) {
			continue;
		}
		$c = strtolower( $it['caption'] );
		if ( strpos( $c, 'bedroom' ) !== false || strpos( $c, 'suite' ) !== false || strpos( $c, 'sleep' ) !== false || strpos( $c, 'king bed' ) !== false || strpos( $c, 'bunk' ) !== false ) {
			if ( strpos( $c, 'bathroom' ) !== false && strpos( $c, 'bedroom' ) === false ) {
				continue;
			}
			$pool[] = $j;
		}
	}
	$p = 0;
	for ( $ri = 0; $ri < $n_rooms; $ri++ ) {
		if ( $assigned[ $ri ] !== '' || ! isset( $pool[ $p ] ) ) {
			continue;
		}
		$j                   = $pool[ $p ];
		$assigned[ $ri ]     = $items[ $j ]['url'];
		$items[ $j ]['used'] = true;
		++$p;
	}

	return $assigned;
}

/**
 * Human-readable bed list for one room (e.g. "One King Bed", "Two King Beds, One Queen Bed").
 *
 * @param array<string,int> $beds Bed type => count from API.
 */
function guesty_format_room_beds_description( $beds ) {
	if ( ! is_array( $beds ) ) {
		return '';
	}

	$labels = array(
		'KING_BED'         => array( 'King Bed', 'King Beds' ),
		'QUEEN_BED'        => array( 'Queen Bed', 'Queen Beds' ),
		'DOUBLE_BED'       => array( 'Double Bed', 'Double Beds' ),
		'SINGLE_BED'       => array( 'Twin Bed', 'Twin Beds' ),
		'SOFA_BED'         => array( 'Sofa Bed', 'Sofa Beds' ),
		'AIR_MATTRESS'     => array( 'Air Mattress', 'Air Mattresses' ),
		'BUNK_BED'         => array( 'Bunk Bed', 'Bunk Beds' ),
		'FLOOR_MATTRESS'   => array( 'Floor Mattress', 'Floor Mattresses' ),
		'WATER_BED'        => array( 'Water Bed', 'Water Beds' ),
		'TODDLER_BED'      => array( 'Toddler Bed', 'Toddler Beds' ),
		'CRIB'             => array( 'Crib', 'Cribs' ),
	);

	$number_words = array(
		1 => 'One', 2 => 'Two', 3 => 'Three', 4 => 'Four', 5 => 'Five',
		6 => 'Six', 7 => 'Seven', 8 => 'Eight', 9 => 'Nine', 10 => 'Ten',
		11 => 'Eleven', 12 => 'Twelve',
	);

	$parts = array();
	foreach ( $beds as $key => $qty ) {
		$qty = (int) $qty;
		if ( $qty < 1 || ! isset( $labels[ $key ] ) ) {
			continue;
		}
		list( $one, $many ) = $labels[ $key ];
		if ( $qty === 1 ) {
			$parts[] = 'One ' . $one;
		} elseif ( isset( $number_words[ $qty ] ) ) {
			$parts[] = $number_words[ $qty ] . ' ' . $many;
		} else {
			$parts[] = $qty . ' ' . $many;
		}
	}

	return implode( ', ', $parts );
}

/**
 * Total bed count in a room (for icon choice).
 *
 * @param array<string,int> $beds
 */
function guesty_count_beds_in_room( $beds ) {
	if ( ! is_array( $beds ) ) {
		return 0;
	}
	$n = 0;
	foreach ( $beds as $qty ) {
		$n += (int) $qty;
	}
	return $n;
}

/**
 * Fetch listing bedArrangements from Booking Engine API.
 *
 * @param string $listing_id
 * @param string $token
 * @return array|WP_Error
 */
function guesty_fetch_listing_bed_arrangements( $listing_id, $token ) {
	if ( ! $token ) {
		return new WP_Error( 'no_token', 'Unable to retrieve API token.' );
	}

	$fields = 'bedArrangements pictures';
	$url    = 'https://booking.guesty.com/api/listings/' . rawurlencode( $listing_id ) . '?fields=' . rawurlencode( $fields );
	$response = wp_remote_get(
		$url,
		array(
			'headers' => array(
				'Authorization' => 'Bearer ' . $token,
				'Accept'        => 'application/json; charset=utf-8',
			),
			'timeout' => 25,
		)
	);

	if ( is_wp_error( $response ) ) {
		return $response;
	}

	$code = wp_remote_retrieve_response_code( $response );
	$body = json_decode( wp_remote_retrieve_body( $response ), true );
	if ( $code >= 400 || ! is_array( $body ) ) {
		return new WP_Error( 'api_error', 'Listing request failed.', array( 'status' => $code ) );
	}

	return $body;
}

/**
 * Wrap bedroom content in the outer collapsible module shell.
 *
 * @param string $inner_html  Cards list or empty-state message.
 * @param int    $room_count  Number of sleeping spaces (0 = show alternate meta).
 * @param string $title       Module heading.
 * @param bool   $shell_open  Whether outer details starts open.
 * @param bool   $has_data    If false, inner is an unavailable message (shell opens so it’s visible).
 */
function guesty_bedrooms_module_shell( $inner_html, $room_count, $title, $shell_open, $has_data ) {
	$title = $title !== '' ? $title : __( 'Sleeping arrangements', 'mannaguesty' );
	$open = ( $shell_open || ! $has_data ) ? ' open' : '';

	if ( $has_data && $room_count > 0 ) {
		/* translators: %d: number of rooms */
		$meta = sprintf( _n( '%d sleeping space', '%d sleeping spaces', $room_count, 'mannaguesty' ), $room_count );
	} else {
		$meta = __( 'Details unavailable', 'mannaguesty' );
	}

	$icon_bed = '<svg class="guesty-bedrooms-shell-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 20v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3"/><path d="M4 14V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8"/><path d="M2 14h20"/><path d="M8 10h2"/><path d="M14 10h2"/></svg>';

	$html  = '<div class="guesty-bedrooms-module">';
	$html .= '<details class="guesty-bedrooms-shell"' . $open . '>';
	$html .= '<summary class="guesty-bedrooms-shell-summary">';
	$html .= '<span class="guesty-bedrooms-shell-leading" aria-hidden="true">' . $icon_bed . '</span>';
	$html .= '<span class="guesty-bedrooms-shell-text">';
	$html .= '<span class="guesty-bedrooms-shell-title">' . esc_html( $title ) . '</span>';
	$html .= '<span class="guesty-bedrooms-shell-meta">' . esc_html( $meta ) . '</span>';
	$html .= '</span>';
	$html .= '<span class="guesty-bedrooms-shell-chevron" aria-hidden="true"></span>';
	$html .= '</summary>';
	$html .= '<div class="guesty-bedrooms-shell-body">';
	$html .= $inner_html;
	$html .= '</div></details></div>';

	return $html;
}

/**
 * Build HTML for bedroom module from API bedArrangements.
 *
 * @param array  $listing_response Decoded GET /listings/{id}?fields=bedArrangements
 * @param bool   $include_shared   Include SHARED_SPACE rooms
 * @param array  $opts             title, expanded, min_width (int px for grid min column)
 */
function guesty_build_bedrooms_html( $listing_response, $include_shared = false, $opts = array() ) {
	$opts = wp_parse_args(
		$opts,
		array(
			'title'     => __( 'Sleeping arrangements', 'mannaguesty' ),
			'expanded'  => false,
			'min_width' => 260,
		)
	);
	$min_w = max( 180, min( 400, (int) $opts['min_width'] ) );

	$arr = isset( $listing_response['bedArrangements']['bedrooms'] )
		? $listing_response['bedArrangements']['bedrooms']
		: array();

	if ( ! is_array( $arr ) || empty( $arr ) ) {
		$msg = '<div class="guesty-bedrooms-shell-inner guesty-bedrooms-shell-inner--empty"><p class="guesty-bedrooms-empty">' . esc_html__( 'Bed configuration isn’t listed for this property yet.', 'mannaguesty' ) . '</p></div>';
		return guesty_bedrooms_module_shell( $msg, 0, $opts['title'], true, false );
	}

	$rooms = array();
	foreach ( $arr as $room ) {
		if ( ! is_array( $room ) ) {
			continue;
		}
		$type = isset( $room['type'] ) ? strtoupper( (string) $room['type'] ) : '';
		if ( ! $include_shared && $type === 'SHARED_SPACE' ) {
			continue;
		}
		$beds = isset( $room['beds'] ) && is_array( $room['beds'] ) ? $room['beds'] : array();
		if ( guesty_count_beds_in_room( $beds ) < 1 ) {
			continue;
		}
		$rooms[] = $room;
	}

	usort(
		$rooms,
		function ( $a, $b ) {
			$na = isset( $a['roomNumber'] ) ? (int) $a['roomNumber'] : 0;
			$nb = isset( $b['roomNumber'] ) ? (int) $b['roomNumber'] : 0;
			return $na <=> $nb;
		}
	);

	if ( empty( $rooms ) ) {
		$msg = '<div class="guesty-bedrooms-shell-inner guesty-bedrooms-shell-inner--empty"><p class="guesty-bedrooms-empty">' . esc_html__( 'No bedroom details found for this listing.', 'mannaguesty' ) . '</p></div>';
		return guesty_bedrooms_module_shell( $msg, 0, $opts['title'], true, false );
	}

	$plugin_url     = defined( 'MANNAPRESS_PLUGIN_URL' ) ? MANNAPRESS_PLUGIN_URL : plugin_dir_url( dirname( __DIR__ ) . '/guesty-token-helper.php' );
	$icon_single    = esc_url( $plugin_url . 'svg/bed.svg' );
	$icon_double    = esc_url( $plugin_url . 'svg/Bed2.svg' );
	$room_count     = count( $rooms );
	$shell_expanded = ! empty( $opts['expanded'] );
	$pictures       = isset( $listing_response['pictures'] ) && is_array( $listing_response['pictures'] ) ? $listing_response['pictures'] : array();
	$photo_by_room  = guesty_assign_photos_to_bedrooms( $rooms, $pictures );

	$list = '<ul class="guesty-bedrooms-cards" role="list" style="--guesty-bedrooms-min:' . (int) $min_w . 'px;">';
	foreach ( $rooms as $i => $room ) {
		$name = isset( $room['name'] ) && $room['name'] !== ''
			? $room['name']
			: sprintf(
				/* translators: %d bedroom index 1-based */
				__( 'Bedroom %d', 'mannaguesty' ),
				$i + 1
			);
		$desc  = guesty_format_room_beds_description( $room['beds'] );
		$total = guesty_count_beds_in_room( $room['beds'] );
		$icon  = ( $total > 1 ) ? $icon_double : $icon_single;
		$photo = isset( $photo_by_room[ $i ] ) ? $photo_by_room[ $i ] : '';

		$list .= '<li class="guesty-bedrooms-card' . ( $photo ? ' guesty-bedrooms-card--has-photo' : '' ) . '">';
		if ( $photo !== '' ) {
			$list .= '<div class="guesty-bedrooms-card-photo"><img src="' . esc_url( $photo ) . '" alt="' . esc_attr( $name ) . '" loading="lazy" decoding="async" /></div>';
		} else {
			$list .= '<div class="guesty-bedrooms-card-photo guesty-bedrooms-card-photo--placeholder" aria-hidden="true"><img src="' . $icon . '" alt="" width="48" height="48" loading="lazy" /></div>';
		}
		$list .= '<div class="guesty-bedrooms-card-body">';
		$list .= '<div class="guesty-bedrooms-card-name">' . esc_html( $name ) . '</div>';
		if ( $desc !== '' ) {
			$list .= '<div class="guesty-bedrooms-card-beds">' . esc_html( $desc ) . '</div>';
		}
		$list .= '</div></li>';
	}
	$list .= '</ul>';

	$inner = '<div class="guesty-bedrooms-shell-inner">' . $list . '</div>';
	return guesty_bedrooms_module_shell( $inner, $room_count, $opts['title'], $shell_expanded, true );
}

function guesty_bedrooms_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'listing_id'     => '',
			'include_shared' => '',
			'title'          => '',
			'expanded'       => '',
			'min_width'      => '260',
		),
		$atts,
		'guesty_bedrooms'
	);

	wp_enqueue_style( 'guesty-bedrooms-style' );
	wp_enqueue_script( 'guesty-bedrooms-script' );

	$include = in_array( strtolower( (string) $atts['include_shared'] ), array( '1', 'yes', 'true' ), true );
	$expanded = in_array( strtolower( (string) $atts['expanded'] ), array( '1', 'yes', 'true' ), true );
	$lid      = trim( (string) $atts['listing_id'] );
	$title     = trim( (string) $atts['title'] );
	$min_width = absint( $atts['min_width'] );
	if ( $min_width < 1 ) {
		$min_width = 260;
	}

	$data_shared   = $include ? '1' : '0';
	$data_expanded = $expanded ? '1' : '0';
	$data_listing  = $lid !== '' ? ' data-listing-id="' . esc_attr( $lid ) . '"' : '';
	$data_title    = $title !== '' ? ' data-module-title="' . esc_attr( $title ) . '"' : '';
	$data_min      = ' data-min-width="' . esc_attr( (string) $min_width ) . '"';

	return '<div id="guesty-bedrooms-root" class="guesty-bedrooms-root guesty-bedrooms-root--loading"' . $data_listing . ' data-include-shared="' . esc_attr( $data_shared ) . '" data-expanded="' . esc_attr( $data_expanded ) . '"' . $data_title . $data_min . '><div class="guesty-bedrooms-module guesty-bedrooms-module--skeleton"><div class="guesty-bedrooms-skeleton-bar"></div><div class="guesty-bedrooms-skeleton-bar guesty-bedrooms-skeleton-bar--short"></div></div></div>';
}

add_shortcode( 'guesty_bedrooms', 'guesty_bedrooms_shortcode' );

add_action( 'wp_ajax_fetch_guesty_bedrooms', 'guesty_ajax_fetch_bedrooms' );
add_action( 'wp_ajax_nopriv_fetch_guesty_bedrooms', 'guesty_ajax_fetch_bedrooms' );

function guesty_ajax_fetch_bedrooms() {
	$listing_id = isset( $_POST['listing_id'] ) ? sanitize_text_field( wp_unslash( $_POST['listing_id'] ) ) : '';
	$include_shared = ! empty( $_POST['include_shared'] ) && $_POST['include_shared'] === '1';
	$expanded       = ! empty( $_POST['expanded'] ) && $_POST['expanded'] === '1';
	$module_title   = isset( $_POST['module_title'] ) ? sanitize_text_field( wp_unslash( $_POST['module_title'] ) ) : '';
	$min_width      = isset( $_POST['min_width'] ) ? absint( $_POST['min_width'] ) : 260;
	if ( $min_width < 1 ) {
		$min_width = 260;
	}

	if ( $listing_id === '' ) {
		wp_send_json_error( array( 'message' => __( 'No listing ID provided.', 'mannaguesty' ) ) );
	}

	$client_id_1 = get_option( 'guesty_client_id_1', '' );
	$client_secret_1 = get_option( 'guesty_client_secret_1', '' );
	$client_id_2 = get_option( 'guesty_client_id_2', '' );
	$client_secret_2 = get_option( 'guesty_client_secret_2', '' );

	$token = guesty_get_bearer_token( $client_id_1, $client_secret_1 );
	$data = guesty_fetch_listing_bed_arrangements( $listing_id, $token );
	$token_set = 1;

	if ( is_wp_error( $data ) || empty( $data['bedArrangements'] ) ) {
		$token = guesty_get_bearer_token( $client_id_2, $client_secret_2 );
		$data = guesty_fetch_listing_bed_arrangements( $listing_id, $token );
		$token_set = 2;
	}

	if ( is_wp_error( $data ) ) {
		wp_send_json_error(
			array(
				'message' => __( 'Could not load bedroom details.', 'mannaguesty' ),
				'error'   => $data->get_error_message(),
			)
		);
	}

	$html = guesty_build_bedrooms_html(
		$data,
		$include_shared,
		array(
			'title'     => $module_title,
			'expanded'  => $expanded,
			'min_width' => $min_width,
		)
	);
	wp_send_json_success( array( 'html' => $html, 'token_set' => $token_set ) );
}
