import { findClosestPos } from '../utils.js';
import { config } from '../config.js';


class BasicSegmentStrategy {

    constructor(dict, manifest, decoder) {
        this.mp4decoder = decoder
        this.cameraPositions = dict;
        this.segmentAmount = manifest.segmentAmount;
        this.totalFrames = manifest.totalFrames;
        this.framesPerSegment = this.totalFrames / this.segmentAmount;
        this.currentlyInBuffer = [];
    }

    getSegment(pos) {

        // Find closest frame
        let closestFrame = findClosestPos(pos, this.cameraPositions);

        // Find what Segment this frame is in.
        let neededSegment = Math.floor(closestFrame / 50) + 1; // + 1 for offset since segments start with 1

        // Decode said segment and buffer it
        if (!this.currentlyInBuffer.includes(neededSegment)) {
            // Ask IndexedDB
            this.mp4decoder.decode(config.VIDEO_URLS[0] + 'seg' + neededSegment.toString() + '.mp4', neededSegment);
            this.currentlyInBuffer.push(neededSegment);
        }
        if (this.currentlyInBuffer.length > config.MAX_DECODED_SEGMENTS_ALLOWED) {
            let toRemove = this.currentlyInBuffer.shift();


            for (let i = toRemove * this.framesPerSegment; i < toRemove * this.framesPerSegment + this.framesPerSegment; ++i) {

                this.mp4decoder.removeFrame(i);
            }
        }
        return closestFrame;
    }


}

export { BasicSegmentStrategy }