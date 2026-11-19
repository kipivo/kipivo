# Project anatomy

Editable MotionHarness Standard scene for the Web brand illustration. From this directory, run `mh open` to scrub the six-second loop in Studio. To inspect sample frames without opening Studio:

```sh
mh preview --times '[0,0.8,2,5.2,5.97]' --contact-sheet --output-dir .tmp/review
```

Edit the plate geometry, palette and keyframes in [the SVG](src/assembly.svg). The homepage, design guide and sign-in and sign-up pages load its `#intro` fragment for a single 1.6-second lift. With reduced motion enabled they load the static image. In Studio, [the scene adapter](src/scene.js) uses the six-second lift, hold and return loop so you can scrub to a specific frame.
