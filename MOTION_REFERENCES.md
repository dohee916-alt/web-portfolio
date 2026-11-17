# Motion references

- https://github.com/shiarauzo/book-flip/blob/main/src/bendMaterial.ts — continuous deformation and bow across a page flip.
- https://tympanus.net/codrops/2021/02/23/creating-an-infinite-circular-gallery-using-webgl-with-ogl-and-glsl-shaders/ — curved gallery and continuous input.
- https://github.com/brucira/3D-radial-gallery/blob/main/src/App.jsx — spatial picking, damped drag velocity.

The implementation in main.js independently adapts the techniques to this portfolio's upright-to-floor sequence and finite timeline. No source assets or third-party example code are distributed.

## Ascending timeline / impact reveal
- https://tympanus.net/codrops/2014/05/12/morphing-buttons-concept/ — action element grows into content.
- https://tympanus.net/codrops/2015/11/24/shazam-like-morphing-button-effect/ — circle-to-content morph sequence.
- https://tympanus.net/codrops/2026/07/30/building-an-infinite-gsap-scroll-gallery-with-parallax-and-flip-transitions/ — shared-element detail transitions.
Independent implementation: projected card top edge contacts an anchor on an ascending arc; anchor moves at impact and interpolates its bounds into the information panel. Content is revealed in sequence; closing reverses the shape transition.

## Center-focus navigation
- https://tympanus.net/codrops/2025/11/11/building-a-3d-infinite-carousel-with-reactive-background-gradients/ — scale and depth by distance from center; wheel and drag input.
- https://tympanus.net/codrops/2021/02/23/creating-an-infinite-circular-gallery-using-webgl-with-ogl-and-glsl-shaders/ — continuous scroll coordinates and center snapping.
- https://www.embla-carousel.com/docs/api/options — centered snap and momentum.
Independent adaptation: finite ascending arc, stronger center depth/size, normalized wheel, predictive mobile snap, flat-card mesh optimization.

## Shared orientation stack
Verified source: https://github.com/codrops/3DStackMotion/blob/main/js/effect-1/stackMotionEffect.js — common group orientation, successive depth offsets. Demo: https://tympanus.net/Development/3DStackMotion/. Adapted to a finite angled arc with parallel planes, modest selected-card displacement, and one quadratic timeline. No third-party code copied.

## Reversible intro timeline
Verified GSAP timeline docs: https://gsap.com/docs/v3/GSAP/Timeline/ and https://gsap.com/docs/v3/Plugins/ScrollTrigger/. Codrops applied example: https://tympanus.net/codrops/2026/05/06/from-shader-uniforms-to-clip-path-wipes-how-gsap-drives-my-portfolio/. The existing canvas uses one normalized playhead with fixed stage durations and separate input targets, adapting timeline play/reverse and scrub rather than accelerating the entire sequence exponentially. No GSAP dependency added.

## Scrubbed stack to gallery
- https://tympanus.net/codrops/2022/05/11/stack-to-content-layout-transition/ — shared stack and gallery elements.
- https://tympanus.net/codrops/2025/11/11/building-a-3d-infinite-carousel-with-reactive-background-gradients/ — continuous curved carousel coordinates.
- https://tympanus.net/codrops/2026/07/07/building-a-scroll-driven-3d-gallery-using-a-blender-camera-path-with-three-js-and-gsap/ — unified directional input.
One playhead, gesture ownership, fresh-wheel gate, and shared final poses. Finite track rather than infinite wrap.
