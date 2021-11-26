let config = 
{
    ENABLE_DEBUGGING_SPHERES: false,
    MAX_DECODED_SEGMENTS_ALLOWED: 4,

    INPUT: {
        'ArrowLeft': -0.1,
        'ArrowUp': -0.1,
        'ArrowRight': 0.1,
        'ArrowDown': 0.1,
        'Space': 0.1,
        'Down' : -0.1
    },

    // DATASET_URL : [  
    //     'debug2D/', 
    // ],
    
    BACKEND_URL_DATASETS_LF : './datasets/',

    FILENAME_DATASET_DASH_MPD : 'dataset.mpd',
    FILENAME_DATASET_MANIFEST_JSON : 'manifest.json',
    FILENAME_DATASET_POSES : 'poses.txt',

    NORMALIZE_DISTANCE: 1,
    PATH_DONE: false
}

export { config };

// Remove config in other implementation and allow users to specifiy.