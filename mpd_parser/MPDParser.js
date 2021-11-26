let parser = new DOMParser();


class MPDParser {
    constructor() {
        this.json = {}
    }

    parse(xml) {
        
        let xmlDoc = parser.parseFromString(xml, "text/xml");
        let currentTag = xmlDoc.getElementsByTagName('MPD')[0];
        this.json = this.parseTag(currentTag);
                
            
    }


    parseTag(htmlTag) {
        let json = {};

        if (htmlTag === undefined) {
            return;
        }

        for (let attribute of htmlTag.getAttributeNames()) {
            json[attribute] = htmlTag.getAttribute(attribute);
        }

        for (let child of htmlTag.children) {

            let tagName = child.tagName;
            
            if(json[tagName] && !Array.isArray(json[tagName])) {
                let temp = json[tagName];
                json[tagName] = [temp];
            }
            if(Array.isArray(json[tagName])){
                json[tagName].push(this.parseTag(child));
            } else{
                json[tagName] = this.parseTag(child);
            }
            

        }

        return json;
    }

    getRepresentations(){
        if(Array.isArray(this.json.Period.AdaptationSet)){
            return this.json.Period.AdaptationSet[0].Representation;
        } else{
            return [this.json.Period.AdaptationSet.Representation];
        }
        
        
        
    }

    getBandWidth(id){
        return this.getRepresentations()[id-1].bandwidth;
    }

    getResolution(id){
        let repr = this.getRepresentations();
        return [parseInt(repr[id-1].width), parseInt(repr[id-1].height)];
    }
}

export { MPDParser }








