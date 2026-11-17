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
