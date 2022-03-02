# SLF4Web

*Adaptive streaming and rendering of Static Light Fields (SLFs) in the Web browser*

![Logo UHasselt-EDM](/assets/images/logo_UHasselt_EDM.png "Logo UHasselt-EDM")

![Logo Flanders Make](/assets/images/logo_FlandersMake.png "Logo Flanders Make")

Static light fields (SLFs) are an image-based technology that allow for the photorealistic representation of inanimate objects and scenes in virtual environments. As such, static light fields have application opportunities in heterogeneous domains, including education, cultural heritage and entertainment. `SLF4Web` is a Web-based implementation of a static light field consumption system; it allows SLF datasets to be adaptively streamed over the network (via MPEG-DASH) and then to be visualized in a vanilla Web browser.

If you publish a scientific paper that is based on (or makes use of) `SLF4Web`, you must cite the following conference publication:

> Hendrik Lievens, Maarten Wijnants, Brent Zoomers, Jeroen Put, Nick Michiels, Peter Quax, and Wim Lamotte. Adaptive Streaming and Rendering of Static Light Fields in the Web Browser. In: Proceedings of the 12th International Conference on 3D Immersion (IC3D), 2021.

Be sure to check out this publication if you want to know more about e.g. the `SLF4Web` implementation or the video-based format that is applied for storing, streaming and rendering SLF datasets.

## Deployment

1. Clone repository and deploy it on an HTTP server
2. (OPTIONAL) Download additional SLF datasets and deploy them in the `datasets` folder
3. Enable `Experimental Web Platform features` flag in Google Chrome (needed for `WebCodecs API` support): [chrome://flags/#enable-experimental-web-platform-features](chrome://flags/#enable-experimental-web-platform-features)
4. Insert the URL to the deployed `SLF4Web` repository in Google Chrome

## Light field content

This repository comes equipped with only a single SLF dataset called `debug2D`. As its name implies, this dataset is mainly intended for debugging purposes. `debug2D` consists of black images with frame numbers printed on top of them (in white font); as such, this dataset allows to easily ascertain exactly which source view is currently being visualized:

![Example frame from the debug2D dataset](/assets/images/debug2d_frame0001.png "Example frame from the debug2D dataset")

More SLF datasets can be found [here](https://doi.org/10.5281/zenodo.5730526); simply deploy them alongside `debug2D` in the `datasets` folder. **Never** push datasets to the `SLF4Web` repository to prevent it from excessively growing in size.

## Incorporating one or more SLF objects in a WebGL scene

The `SLObject` class makes it easy to incorporate static light field objects in 3D scenes. It suffices to specify the desired 3D position of the SLF object in the scene as well as the (dataset) name of the SLF object that you want to deploy, as follows:

```javascript
// TODO: Setup standard three.js scene.

// Position the `debug2D` static light field at coordinates {x:0, y:1, z:0}.
let slo = new SLObject([0, 1, 0], 'debug2D');
// Add created object to three.js scene.
scene.add(slo);
```

The same SLF dataset can be deployed at different locations within a single 3D scene. If so, the different instances will share the client-side cache of the SLF dataset, so that the constituting source views only need to be network streamed once.

## WebVR support

The `SLF4Web` renderer supports not only keyboard and mouse input, but also VR-based consumption via `WebXR`. VR-based consumption is implemented via the [`VRButton`](https://threejs.org/docs/#manual/en/introduction/How-to-create-VR-content) module from `three.js`. Click on the `Enter VR` button at the bottom of the screen to enter VR mode.

## Used libraries

### three.js
`three.js` is a cross-browser JavaScript library and application programming interface (API) used to create and display animated 3D computer graphics in a web browser using WebGL.

Docs: <https://threejs.org/docs/index.html>

### Dexie.js
`Dexie.js` is a wrapper library for `IndexedDB`.

Docs: <https://dexie.org/docs/>

### WebCodecs
The `WebCodecs API` allows Web applications to encode and decode audio and video.

Docs: <https://www.w3.org/TR/webcodecs/>
