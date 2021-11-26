// import { MP4Decoder, dictDecodedFrame, readyFlag } from "../decoder.js";

// let mp4decoder = new MP4Decoder();


//
// Define your database
//

let array = [];
var db = new Dexie("segment_database");
db.version(5).stores({
    segments: '[segmentId+reprId+dbName],blob'
});

export let dictInDexie = {
    dict: {},
    listener: function (key, value) { },
    add2Dict(key, value) {
        if (key in this.dict) {
            if (this.dict[key] > value) {
                this.dict[key] = value;
            }
        } else {
            this.dict[key] = value;
        }

        this.listener(key, value);
    },
    getDict() {
        return this.dict;
    }
};

db.segments.toArray().then(allEntries => {

    for (let entry of allEntries) {

        dictInDexie.add2Dict([entry.dbName, entry.segmentId], entry.reprId);

    }


});

export function addToDatabase(segmentIdIn, reprIdIn, dbNameIn, blobIn) {
    let startTime = window.performance.now();

    db.segments.add({ segmentId: segmentIdIn, reprId: reprIdIn, dbName: dbNameIn, blob: blobIn })
        .then( (result) => {
            array.push(window.performance.now() - startTime);

        })
        .catch(function (error) {
            // console.log(error);
        });

    dictInDexie.add2Dict([dbNameIn, segmentIdIn], reprIdIn);




}


export async function getSegment(segmentNumber, dbName, maxQualityIndex) {
    let toFetchArray = [];
    for(let i = 1; i <= maxQualityIndex; ++i){
        toFetchArray.push([segmentNumber, i, dbName]);
    }

    return db.segments.bulkGet(toFetchArray);
    
}









