import { findClosestPos } from '../utils.js';
import { config } from '../config.js';

import { getSegment, addToDatabase, dictInDexie } from '../file_system/dexie.js';

import { BasicQualitySelectionStrategy } from '../resolution_selection_strategies/BasicQualitySelectionStrategy.js';
import { Low2HighFetchStrategy } from '../abr_strategies/Low2HighABRStrategy.js';


class AdvancedSegmentStrategy {

    constructor(dict, manifest, decoder, mpdText, dbName) {
        this.mp4decoder = decoder
        this.cameraPositions = dict;
        this.segmentAmount = manifest.segmentAmount;
        this.totalFrames = manifest.totalFrames;
        this.framesPerSegment = manifest.frameRate * manifest.segmentLength;
        this.currentlyInBuffer = [];

        this.qualitySelectionStrategy = new BasicQualitySelectionStrategy(mpdText);
        this.idleFetchStrategy = new Low2HighFetchStrategy(this.qualitySelectionStrategy, dbName, this.segmentAmount);

        this.datasetName = dbName;

        this.initSegments = {};

        this.array = [];

       
        getSegment(0, dbName, this.qualitySelectionStrategy.getAmountAllowedResolutions()).then(object => {
            let isInDexie = false;
            for (let entry of object) {
                if (entry != undefined) {
                    isInDexie = true;
                    if (isInDexie) {

                        this.initSegments[entry.reprId] = entry.blob;
                    }
                }
            }
        })
        
        for (let i = 1; i <= this.qualitySelectionStrategy.getAmountAllowedResolutions(); ++i) {

            if (!(i.toString() in this.initSegments)) {
                // FIXME: TODO: Automatically construct Init Segment URL 
                //              based on MPD.
                fetch(config.BACKEND_URL_DATASETS_LF + this.datasetName + '/' + i.toString() + '/segment_init.mp4')
                    .then(x => x.blob())
                    .then(blobIn => {
                        addToDatabase(0, i, this.datasetName, blobIn);
                        this.initSegments[i] = blobIn;
                    });
            }
        }
    }

    getSegment(pos, lfsCenter) {

        // Find closest frame

        let closestFrame = findClosestPos(pos, this.cameraPositions, lfsCenter);

        let neededSegments = [];
        // Find what Segment this frame is in.
        neededSegments.push(Math.floor(closestFrame / this.framesPerSegment) + 1); // + 1 for offset since segments start with 1

        
        if (this.totalFrames / this.framesPerSegment !== this.segmentAmount) {
            
            let maskFrame = closestFrame + this.totalFrames;
            neededSegments.push(Math.floor(maskFrame / this.framesPerSegment) + 1);
        }
        // console.log(neededSegments);

        // Decode said segment and buffer it
        for (let neededSegment of neededSegments) {
            if (!this.currentlyInBuffer.includes(neededSegment)) {
                let startTime = window.performance.now();
                getSegment(neededSegment, this.datasetName, this.qualitySelectionStrategy.getAmountAllowedResolutions()).then(object => {
                    this.array.push(window.performance.now() - startTime);
                    let isInDexie = false;
                    for (let entry of object) {
                        if (entry != undefined) {
                            isInDexie = true;
                        }
                    }

                    if (!isInDexie) {
                       this.idleFetchStrategy.unsetIdleFetchFlag();
                        // If not in Dexie database
                        let qualityId = this.qualitySelectionStrategy.selectQuality();

                        if (qualityId == -1) {
                            console.log('Not Enough Bandwidth Available');
                        } else {
                            this.qualitySelectionStrategy.substractBandwidth(qualityId);

                            // FIXME: TODO: Automatically construct Media 
                            //              Segment URL based on MPD.
                            fetch(config.BACKEND_URL_DATASETS_LF + this.datasetName  + '/' + qualityId.toString() + '/segment_' + neededSegment.toString() + '.m4s')
                                .then(x => {
                                    this.idleFetchStrategy.setIdleFetchFlag()
                                    this.qualitySelectionStrategy.addBandwidth(qualityId);
                                    return x.blob();
                                })
                                .then(blobIn => {
                                    addToDatabase(neededSegment, qualityId, this.datasetName, blobIn);
                                    // let newBlob = new Blob([this.initSegments[qualityId], object[qualityId - 1].blob])
                                    // let blobURL = window.URL.createObjectURL(newBlob);
                                    // this.mp4decoder.decode(blobURL, neededSegment);
                                });
                               
                        }

                    } else {
                       
                        let lowestResolutionIndex = this.qualitySelectionStrategy.getAmountAllowedResolutions();
                        for (let i = lowestResolutionIndex - 1; i >= 0; i--) {
                            if (object[i] != undefined) {
                                lowestResolutionIndex = i;
                            }
                        }
                        if ((lowestResolutionIndex + 1).toString() in this.initSegments) {
                            let newBlob = new Blob([this.initSegments[lowestResolutionIndex + 1], object[lowestResolutionIndex].blob])
                            let blobURL = window.URL.createObjectURL(newBlob);
                            this.mp4decoder.decode(blobURL, neededSegment);
                        }
                    }

                })

                this.currentlyInBuffer.push(neededSegment);
            }
            
        }


        // Checks if there are a valid amount of segmenets buffered : IF NOT removes oldest segments
        if (this.currentlyInBuffer.length > config.MAX_DECODED_SEGMENTS_ALLOWED) {
            while (this.currentlyInBuffer.length > config.MAX_DECODED_SEGMENTS_ALLOWED) {
                this.currentlyInBuffer.shift();
            }
        }

        // Creates a list of valid segments and removes all other segments from buffer
        let validFrames = []
        for (let seg of this.currentlyInBuffer) {
            for (let i = (seg * this.framesPerSegment) - this.framesPerSegment; i < seg * this.framesPerSegment; ++i) {
                validFrames.push(i);
            }
        }
        this.mp4decoder.removeExcessFrames(validFrames);



        return closestFrame;
    }

    getSegmentsIdle() {
        this.idleFetchStrategy.getSegmentsIdle();
    }

    getCurrentlyInBuffer() {
        return this.currentlyInBuffer;
    }

    getCurrentlyInDexie() {
        return dictInDexie;
    }

    getAmountAvailableQualities() {
        return this.qualitySelectionStrategy.getAmountAllowedResolutions();
    }

    setDexieCallback(callbackFunction){
        dictInDexie.listener = callbackFunction;
    }

    setFetchCallback(callbackFunction){
        this.idleFetchStrategy.setFetchCallback(callbackFunction);
    }

    




}

export { AdvancedSegmentStrategy }