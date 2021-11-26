import { config } from './config.js';


/**
 * Generates the back-end URLs for specific types of files pertaining to 
 * LF datasets.
 */
export default class FormatterUrlDataset {

    static getUrlPosesFile(nameDataset, 
                           strBaseUrl = config.BACKEND_URL_DATASETS_LF) {
        return FormatterUrlDataset.getUrlDatasetFile(
            nameDataset, config.FILENAME_DATASET_POSES, strBaseUrl
        );
    }

    static getUrlManifestJson(nameDataset, 
                              strBaseUrl = config.BACKEND_URL_DATASETS_LF) {
        return FormatterUrlDataset.getUrlDatasetFile(
            nameDataset, config.FILENAME_DATASET_MANIFEST_JSON, strBaseUrl
        );
    }

    static getUrlDashMpd(nameDataset, 
                         strBaseUrl = config.BACKEND_URL_DATASETS_LF) {
        return FormatterUrlDataset.getUrlDatasetFile(
            nameDataset, config.FILENAME_DATASET_DASH_MPD, strBaseUrl
        );
    }

    /**
     * @param  {!string} nameDataset 
     * @param  {!string} nameFile 
     * @param  {?string} [strBaseUrl=config.BACKEND_URL_DATASETS_LF]
     * @return {string}
     * @private
     */
    static getUrlDatasetFile(
        nameDataset, nameFile, strBaseUrl = config.BACKEND_URL_DATASETS_LF
    ) {
        return window.urljoin(
            strBaseUrl,
            nameDataset,
            nameFile
        );
    }

}