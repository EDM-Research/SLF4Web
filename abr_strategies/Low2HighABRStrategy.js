
import { getSegment, addToDatabase } from '../file_system/dexie.js';
import { config } from '../config.js';




class Low2HighFetchStrategy {

    constructor(qualitySelectionStrategyIn, dbName, segmentAmount) {
        this.allowIdleFetch = true;
        this.idleCurrentSegmentNumber = 1;
        this.idleCurrentResolution = qualitySelectionStrategyIn.getAmountAllowedResolutions(); 
        this.segmentsFetchFinished = false;
        this.qualitySelectionStrategy = qualitySelectionStrategyIn;
        this.databaseName = dbName;
        this.totalSegmentAmount = segmentAmount;

        this.array = [];

        //
        this.currentlyGettingFetched = {
            dict: {},
            listener: () => { },
            add2Dict(key, value) {
                this.dict[key] = value;
                this.listener(key, value);
            },
            removeFromDict(key) {
                delete this.dict[key];
            },
            getDict() {
                return this.dict;
            }
        };
        //
    }

    

    async getSegmentsIdle() {
        while (!this.segmentsFetchFinished) {
            // Has to be kept 
            while (this.allowIdleFetch && this.idleCurrentResolution > 0) {
                for (this.idleCurrentSegmentNumber = 1; this.idleCurrentSegmentNumber <= this.totalSegmentAmount; ++this.idleCurrentSegmentNumber) {
                    let startTime = window.performance.now();
                    await getSegment(this.idleCurrentSegmentNumber, this.databaseName, this.qualitySelectionStrategy.getAmountAllowedResolutions())
                        .then(object => {
                            
                            this.array.push(window.performance.now() - startTime);
                            if (object[this.idleCurrentResolution - 1] == undefined) { // TODO : replace with if no higher resolution.
                                this.qualitySelectionStrategy.substractBandwidth(this.idleCurrentResolution);
                                let qualityId = this.idleCurrentResolution;
                                let segmentId = this.idleCurrentSegmentNumber;

                                //




                                this.currentlyGettingFetched.add2Dict(segmentId, qualityId);


                                // FIXME: TODO: Automatically construct Media 
                                //              Segment URL based on MPD.
                                fetch(config.BACKEND_URL_DATASETS_LF + this.databaseName + '/' + qualityId.toString() + '/segment_' + segmentId.toString() + '.m4s')
                                    .then(x => {


                                        this.currentlyGettingFetched.removeFromDict(segmentId);


                                        this.qualitySelectionStrategy.addBandwidth(qualityId);
                                        return x.blob();
                                    }) // TIME
                                    .then(blobIn => {
                                        addToDatabase(segmentId, qualityId, this.databaseName, blobIn);
                                    });
                            }
                        })
                }
                this.idleCurrentResolution -= 1;
                if (this.idleCurrentResolution <= 0) {
                    this.segmentsFetchFinished = true;
                    break;
                }
            }
            if (this.segmentsFetchFinished) {
                break;
            }
        }
    }

    setIdleFetchFlag() {
        this.allowIdleFetch = true;
    }
    unsetIdleFetchFlag() {
        this.allowIdleFetch = false;
    }

    setFetchCallback(callbackFuntion) {
        this.currentlyGettingFetched.listener = callbackFuntion;

    }
}

export { Low2HighFetchStrategy }