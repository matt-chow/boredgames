<!--
  The SVG fallbacks for every asset key in assets.ts. Miniatures are drawn in three-quarter view, lit from the upper
  left: a lit face, a shaded face and a roof, so the flat board reads as a tabletop model. Symbol ids never change.
-->
<script lang="ts"></script>

<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <pattern id="ax-gravel" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="#d8c79a" />
      <circle cx="2" cy="2" r="1" fill="#a8946a" /><circle cx="6" cy="5" r="0.9" fill="#8f7c55" /><circle cx="3.5" cy="6.8" r="0.6" fill="#bba981" />
    </pattern>
    <pattern id="ax-paper" width="120" height="120" patternUnits="userSpaceOnUse">
      <rect width="120" height="120" fill="transparent" />
      <circle cx="17" cy="23" r="0.8" fill="#000" opacity="0.06" /><circle cx="83" cy="61" r="0.7" fill="#000" opacity="0.05" />
      <circle cx="44" cy="97" r="0.9" fill="#000" opacity="0.05" /><circle cx="101" cy="12" r="0.6" fill="#fff" opacity="0.2" />
      <circle cx="62" cy="34" r="0.6" fill="#fff" opacity="0.18" />
    </pattern>
    <pattern id="ax-check" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="#f4eedc" /><rect width="4" height="4" fill="#1d1a14" /><rect x="4" y="4" width="4" height="4" fill="#1d1a14" />
    </pattern>
    <radialGradient id="ax-shadow">
      <stop offset="0" stop-color="#000" stop-opacity="0.32" /><stop offset="1" stop-color="#000" stop-opacity="0" />
    </radialGradient>

    <symbol id="ax-prop-stand" viewBox="0 0 96 54">
      <path d="M4 40 L14 14 L92 14 L92 40 Z" fill="#e9e0c6" /><path d="M4 40 L14 14 L14 46 L4 50 Z" fill="#b9ae90" />
      <path d="M14 14 L92 14 L92 40 L14 40 Z" fill="#d9cfb2" />
      {#each [0, 1, 2, 3] as r (r)}<path d="M16 {18 + r * 5.5} L90 {18 + r * 5.5}" stroke="#8a7f66" stroke-width="1.4" />{/each}
      {#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as k (k)}<circle cx={20 + k * 6} cy={20 + (k % 3) * 5.5} r="1.3" fill={['#c8402c', '#2c5d7c', '#d9a53a'][k % 3]} />{/each}
      <path d="M10 8 L94 8 L92 14 L14 14 Z" fill="#c8402c" /><path d="M10 8 L14 14 L4 16 Z" fill="#8e2c1e" />
      {#each [0, 1, 2, 3, 4, 5, 6] as k (k)}<path d="M{14 + k * 12} 8 L{20 + k * 12} 8 L{20 + k * 12} 14 L{14 + k * 12} 14 Z" fill="#f4eedc" />{/each}
      <path d="M14 40 L92 40 L92 46 L14 46 Z" fill="#8a7f66" />
    </symbol>

    <symbol id="ax-prop-tree" viewBox="0 0 38 46">
      <rect x="17" y="30" width="4" height="12" fill="#6a4a2c" />
      <circle cx="19" cy="20" r="15" fill="#3d6a3a" /><circle cx="14" cy="15" r="9" fill="#5a8a4a" />
      <circle cx="25" cy="25" r="8" fill="#2f5530" /><circle cx="12" cy="12" r="3.5" fill="#7aa65e" opacity="0.8" />
    </symbol>

    <symbol id="ax-prop-pine" viewBox="0 0 30 50">
      <rect x="13" y="38" width="4" height="9" fill="#5a3e26" />
      <path d="M15 2 L27 22 L3 22 Z" fill="#2f5a3a" /><path d="M15 12 L28 32 L2 32 Z" fill="#2a5034" />
      <path d="M15 22 L29 41 L1 41 Z" fill="#244a2f" /><path d="M15 2 L15 41 L1 41 L15 22 L3 32 L15 12 L3 22 Z" fill="#3f7048" />
    </symbol>

    <symbol id="ax-prop-palm" viewBox="0 0 40 56">
      <path d="M19 52 Q17 34 22 16" stroke="#8a6440" stroke-width="3.5" fill="none" stroke-linecap="round" />
      <path d="M22 16 Q10 8 2 16 Q12 12 22 17 Z" fill="#3d7a42" /><path d="M22 16 Q34 6 39 16 Q30 12 22 17 Z" fill="#2f6636" />
      <path d="M22 16 Q16 2 6 4 Q16 8 22 16 Z" fill="#4c8a4c" /><path d="M22 16 Q28 2 36 4 Q27 9 22 16 Z" fill="#3d7a42" />
      <path d="M22 16 Q30 22 34 32 Q25 23 21 17 Z" fill="#2a5a30" /><circle cx="22" cy="17" r="2.5" fill="#6a4a2c" />
    </symbol>

    <symbol id="ax-prop-cactus" viewBox="0 0 24 36">
      <rect x="9" y="4" width="7" height="30" rx="3.5" fill="#4f7d46" /><rect x="9" y="4" width="3" height="30" rx="1.5" fill="#6a9a58" />
      <path d="M9 18 L4 18 L4 10" stroke="#4f7d46" stroke-width="4" fill="none" stroke-linecap="round" />
      <path d="M16 22 L20 22 L20 13" stroke="#3f6a3a" stroke-width="4" fill="none" stroke-linecap="round" />
    </symbol>

    <symbol id="ax-prop-house" viewBox="0 0 46 42">
      <path d="M4 22 L14 16 L14 38 L4 40 Z" fill="#c9b994" /><rect x="14" y="16" width="28" height="22" fill="#efe4c8" />
      <path d="M2 23 L14 6 L44 6 L42 17 L14 17 Z" fill="#b24a32" /><path d="M2 23 L14 6 L14 17 Z" fill="#7e3322" />
      <rect x="19" y="22" width="6" height="7" fill="#2c5d7c" /><rect x="31" y="22" width="6" height="7" fill="#2c5d7c" />
      <rect x="26" y="29" width="5" height="9" fill="#6a4a2c" />
    </symbol>

    <symbol id="ax-prop-hangar" viewBox="0 0 92 56">
      <path d="M4 50 L4 30 Q4 12 22 8 L22 48 Z" fill="#8f9389" /><path d="M22 8 Q48 2 88 8 L88 48 L22 48 Z" fill="#c4c6bd" />
      <path d="M22 8 Q48 2 88 8" stroke="#e8e9e2" stroke-width="2" fill="none" />
      {#each [0, 1, 2, 3, 4, 5] as k (k)}<path d="M{30 + k * 10} 6 L{30 + k * 10} 48" stroke="#a9aba2" stroke-width="0.8" />{/each}
      <rect x="34" y="24" width="40" height="24" fill="#3a3b37" /><rect x="34" y="24" width="40" height="3" fill="#56574f" />
      <text x="54" y="20" font-size="7" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#c8402c">3</text>
    </symbol>

    <symbol id="ax-prop-tower" viewBox="0 0 34 72">
      <path d="M10 70 L13 26 L21 26 L24 70 Z" fill="#e6dcc0" /><path d="M10 70 L13 26 L15 26 L13 70 Z" fill="#b7ab8c" />
      <rect x="5" y="12" width="24" height="14" fill="#2c3e46" /><rect x="5" y="12" width="24" height="3" fill="#9fc0c9" opacity="0.6" />
      <path d="M3 12 L17 4 L31 12 Z" fill="#c8402c" /><path d="M3 12 L17 4 L17 12 Z" fill="#8e2c1e" />
      <path d="M17 4 L17 0" stroke="#1d1a14" stroke-width="1" /><path d="M17 0 L23 2 L17 3 Z" fill="#d9a53a" />
    </symbol>

    <symbol id="ax-prop-windmill" viewBox="0 0 44 76">
      <path d="M12 74 L16 30 L28 30 L32 74 Z" fill="#e8dcbc" /><path d="M12 74 L16 30 L20 30 L17 74 Z" fill="#bcae8a" />
      <path d="M14 31 L22 20 L30 31 Z" fill="#5a4636" />
      <g transform="translate(22 26)" stroke="#6a4a2c" stroke-width="1.6">
        <path d="M0 0 L-18 -18" /><path d="M0 0 L18 -18" /><path d="M0 0 L16 16" /><path d="M0 0 L-16 16" />
      </g>
      <g transform="translate(22 26)" fill="#f4eedc" stroke="#6a4a2c" stroke-width="0.6">
        <path d="M-6 -6 L-18 -18 L-21 -13 L-9 -2 Z" /><path d="M6 -6 L18 -18 L13 -21 L2 -9 Z" />
        <path d="M6 6 L16 16 L19 11 L9 2 Z" /><path d="M-6 6 L-16 16 L-11 19 L-2 9 Z" />
      </g>
      <rect x="19" y="60" width="6" height="14" fill="#6a4a2c" />
    </symbol>

    <symbol id="ax-prop-rock" viewBox="0 0 40 28">
      <path d="M2 24 L8 10 L20 4 L32 8 L38 22 L30 26 L10 27 Z" fill="#8c8576" />
      <path d="M8 10 L20 4 L24 14 L12 18 Z" fill="#aaa393" /><path d="M24 14 L32 8 L38 22 L30 26 Z" fill="#6f6a5d" />
    </symbol>

    <symbol id="ax-prop-barn" viewBox="0 0 56 46">
      <path d="M4 24 L16 18 L16 42 L4 44 Z" fill="#7a2a1e" /><rect x="16" y="18" width="36" height="24" fill="#a63a28" />
      <path d="M2 25 L16 4 L54 4 L52 18 L16 18 Z" fill="#4a4a46" /><path d="M2 25 L16 4 L16 18 Z" fill="#33332f" />
      <rect x="27" y="25" width="14" height="17" fill="#f4eedc" /><path d="M27 25 L41 42 M41 25 L27 42" stroke="#a63a28" stroke-width="2" />
    </symbol>

    <symbol id="ax-prop-tent" viewBox="0 0 40 32">
      <path d="M2 30 L20 4 L38 30 Z" fill="#f4eedc" /><path d="M2 30 L20 4 L14 30 Z" fill="#d9cfb2" />
      {#each [0, 1, 2] as k (k)}<path d="M{20 + k * 6} {4 + k * 9} L{24 + k * 5} 30 L{20 + k * 5} 30 L{18 + k * 4} {8 + k * 9} Z" fill="#c8402c" opacity="0.9" />{/each}
      <path d="M20 4 L20 0 L26 2 L20 3" fill="#2c5d7c" stroke="#1d1a14" stroke-width="0.6" />
    </symbol>

    <symbol id="ax-prop-lighthouse" viewBox="0 0 30 80">
      <path d="M8 78 L11 22 L19 22 L22 78 Z" fill="#f4eedc" /><path d="M8 78 L11 22 L14 22 L12 78 Z" fill="#cfc4a4" />
      {#each [0, 1, 2] as k (k)}<path d="M{9.2 - k * 0.6 + 0.2} {34 + k * 16} L{20.8 + k * 0.6} {34 + k * 16} L{21.2 + k * 0.6} {42 + k * 16} L{8.8 - k * 0.6} {42 + k * 16} Z" fill="#c8402c" />{/each}
      <rect x="9" y="12" width="12" height="10" fill="#2c3e46" /><rect x="11" y="14" width="8" height="6" fill="#f2d27a" />
      <path d="M7 12 L15 4 L23 12 Z" fill="#1d1a14" />
    </symbol>

    <symbol id="ax-prop-boat" viewBox="0 0 48 30">
      <path d="M2 18 L46 18 L40 27 L8 27 Z" fill="#2c5d7c" /><path d="M2 18 L46 18 L45 20 L3 20 Z" fill="#f4eedc" />
      <path d="M24 17 L24 2" stroke="#6a4a2c" stroke-width="1.4" /><path d="M25 3 L40 16 L25 16 Z" fill="#f4eedc" />
      <path d="M23 5 L12 16 L23 16 Z" fill="#c8402c" />
    </symbol>

    <symbol id="ax-prop-shrine" viewBox="0 0 44 48">
      <rect x="8" y="22" width="28" height="22" fill="#e8dcbc" /><rect x="8" y="22" width="6" height="22" fill="#c4b690" />
      <path d="M2 24 Q22 10 42 24 L38 18 Q22 6 6 18 Z" fill="#3a3a37" /><path d="M6 18 Q22 6 38 18" stroke="#56574f" stroke-width="1.4" fill="none" />
      <rect x="18" y="30" width="8" height="14" fill="#8e2c1e" />
      <path d="M22 6 L22 1" stroke="#3a3a37" stroke-width="1.6" />
    </symbol>

    <symbol id="ax-prop-dune" viewBox="0 0 80 26">
      <path d="M0 24 Q20 2 44 10 Q62 16 80 24 Z" fill="#d9b678" /><path d="M0 24 Q20 2 44 10 Q30 14 24 24 Z" fill="#ebcf95" />
      <path d="M14 18 Q24 14 34 16" stroke="#c49a5c" stroke-width="0.8" fill="none" />
    </symbol>

    <symbol id="ax-prop-pits" viewBox="0 0 110 40">
      <path d="M2 14 L108 14 L108 38 L2 38 Z" fill="#e6dcc0" /><path d="M2 8 L108 8 L108 14 L2 14 Z" fill="#2c5d7c" />
      {#each [0, 1, 2, 3, 4, 5, 6] as k (k)}
        <rect x={6 + k * 15} y="18" width="11" height="20" fill="#3a3b37" />
        <rect x={6 + k * 15} y="18" width="11" height="2" fill="#56574f" />
      {/each}
      <path d="M2 8 L108 8" stroke="#f4eedc" stroke-width="1.2" />
    </symbol>

    <symbol id="ax-prop-bridge" viewBox="0 0 120 40">
      <path d="M0 18 L120 18 L120 26 L0 26 Z" fill="#c8402c" />
      <path d="M0 26 L120 26 L120 30 L0 30 Z" fill="#8e2c1e" />
      {#each [0, 1, 2, 3, 4, 5, 6, 7] as k (k)}<rect x={4 + k * 15} y="20" width="9" height="4" fill="#f4eedc" />{/each}
      <path d="M10 30 L10 40 M110 30 L110 40" stroke="#6f6a5d" stroke-width="4" />
      <text x="60" y="16" font-size="8" font-family="sans-serif" font-weight="800" text-anchor="middle" fill="#1d1a14" letter-spacing="1">APEX 66</text>
    </symbol>

    <!-- A front-engined racer seen from above, nose to +x. Body colour comes from the use element's fill. -->
    <symbol id="ax-car" viewBox="0 0 30 14" overflow="visible">
      <rect x="4" y="-0.5" width="5" height="3" rx="1" fill="#1d1a14" /><rect x="4" y="11.5" width="5" height="3" rx="1" fill="#1d1a14" />
      <rect x="21" y="-0.5" width="5" height="3" rx="1" fill="#1d1a14" /><rect x="21" y="11.5" width="5" height="3" rx="1" fill="#1d1a14" />
      <path d="M1 7 Q1 2.5 6 2.5 L20 2 Q29 3 30 7 Q29 11 20 12 L6 11.5 Q1 11.5 1 7 Z" fill="currentColor" stroke="#1d1a14" stroke-width="0.7" />
      <path d="M2 6 L29 6 L29 8 L2 8 Z" fill="var(--stripe, #f1ead8)" opacity="0.95" />
      <path d="M9 4 Q12 7 9 10 L13 10 Q15 7 13 4 Z" fill="#1d1a14" opacity="0.85" />
      <path d="M14 4.2 Q16.5 7 14 9.8" stroke="#9fc0c9" stroke-width="1.2" fill="none" />
      <circle cx="20" cy="7" r="2.6" fill="var(--roundel, #f1ead8)" stroke="#1d1a14" stroke-width="0.5" />
    </symbol>
  </defs>
</svg>
