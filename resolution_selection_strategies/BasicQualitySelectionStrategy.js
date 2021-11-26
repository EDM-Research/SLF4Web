import { MPDParser } from '../mpd_parser/MPDParser.js'
import { getSegment, addToDatabase } from '../file_system/dexie.js';


export class BasicQualitySelectionStrategy{
    constructor(inputXML){

        this.availableBandwidth = 2000000;

        this.MPDParser = new MPDParser();
        this.MPDParser.parse(inputXML);

        

        this.availableBandwidths = {};

        let representations = this.MPDParser.getRepresentations().length;
        for(let i = 1; i <= representations; ++i){
             this.availableBandwidths[i] = parseInt(this.MPDParser.getBandWidth(i));
        }

       
    }

    // Highest that fits
    selectQuality(){
        let currentQualityId = 1;
        
        for(let i = 1; i <= Object.keys(this.availableBandwidths).length; ++i){
            if (this.availableBandwidths[i] < this.availableBandwidth && this.availableBandwidths[i] > this.availableBandwidths[currentQualityId]){
                currentQualityId = i;
            }
        }
        if(this.availableBandwidths[currentQualityId] > this.availableBandwidth){
            return -1;
        }
        return currentQualityId;
    }

    // 

    substractBandwidth(qualityId){
        this.availableBandwidth -= this.availableBandwidths[qualityId];
    }

    addBandwidth(qualityId){
        this.availableBandwidth += this.availableBandwidths[qualityId];
    }

    getAmountAllowedResolutions(){
        return this.MPDParser.getRepresentations().length;
    }

    


}

