import { config } from './config.js';
import { MP4Demuxer } from './mp4box/mp4_demuxer.js';


let debugDict = [];


class MP4Decoder {

    constructor(dbName) { // render
        this.datasetName = dbName
        // this.demuxer = null;
        // this.decoder = new VideoDecoder({
        //     output: (frame) => this.onFrame(frame),
        //     error: e => console.error(e),
        // });


        this.dictDecodedFrame = {};
        this.framesToBeDecoded = 0;
        this.currentDecodedFrame = {};
        this.decoders = {}
        this.demuxers = {}

        this.i; 
        this.startTime = {};
        this.array = {};

        this.maxFrames = 25;

        this.bitmapArray = [];

        

    }

    getDecodedFrames() {
        return this.dictDecodedFrame;
    }

    setMaxFrames(maxFramesIn) {
        this.maxFrames = maxFramesIn;
    }

    async onFrame(frame, segmentNumber) {
        // console.log(segmentNumber);
        this.i = window.performance.now();
        
        
        this.array[segmentNumber].push([this.i - this.startTime[segmentNumber],Object.keys(this.currentDecodedFrame).length]);
        
        
        let bitmap = await createImageBitmap(frame, { imageOrientation: 'flipY' });
        
        frame.close();

        this.dictDecodedFrame[((segmentNumber - 1) * this.maxFrames) + this.currentDecodedFrame[segmentNumber]] = bitmap; 
       
        this.currentDecodedFrame[segmentNumber] = this.currentDecodedFrame[segmentNumber] + 1;

        if(this.currentDecodedFrame[segmentNumber] == this.maxFrames){
            delete this.currentDecodedFrame[segmentNumber];
            delete this.decoders[segmentNumber];
            delete this.demuxers[segmentNumber];
        }
        // console.log(segmentNumber);
        // console.log(config.PATH_DONE, this.currentDecodedFrame);
        if(Object.keys(this.currentDecodedFrame).length == 0 && config.PATH_DONE){
            this.getResults(this.array);
        }
    }

    async decode(url, segmentNumber) {
        // console.log(segmentNumber)
        this.array[segmentNumber] = [];
        this.currentDecodedFrame[segmentNumber] = 0;
        

        this.decoders[segmentNumber] = new VideoDecoder({
            output: (frame) => this.onFrame(frame, segmentNumber),
            error: e => console.error(e),
        });

        let decoder = this.decoders[segmentNumber]
       
        if (url) {
            this.demuxers[segmentNumber] = new MP4Demuxer(url);
            
            this.demuxers[segmentNumber].getConfig().then((config) => {
                
                decoder.configure(config);
                
                // console.log(this.demuxers[segmentNumber]);
                this.demuxers[segmentNumber].start( ( chunk ) => {
                    this.startTime[segmentNumber] = window.performance.now();
                    // console.log(segmentNumber);
                    decoder.decode(chunk);

                })

            });
            
        }
    }

    removeExcessFrame(index) {
        delete this.dictDecodedFrame[index];

    }

    removeExcessFrames(indices) {
        for (let i of Object.keys(this.dictDecodedFrame)) {
            if (!indices.includes(parseInt(i))) {
                delete this.dictDecodedFrame[i];
            }
        }
    }

    getResults(array){
        let firstResult = 0;
        let lastResult = 0;
    
        for(let key of Object.keys(array)){
            firstResult += array[key][0][0];
            lastResult += array[key][array[key].length -1][0];
        }


        console.log(firstResult / Object.keys(array).length,  lastResult / Object.keys(array).length, lastResult / Object.keys(array).length / this.maxFrames);
    }
    
}



export { MP4Decoder };
