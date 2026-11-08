// Minimal shim for knitr functionality used by the ported code
/*
const knit_engines = new Map();
const opts_chunk = new Map();
const knit_hooks = new Map();

// Provide get/set helpers similar to R's behavior
const opts_chunk_api = {
    set: (keyOrObj, val) => {
        if (typeof keyOrObj === 'object') {
            Object.assign(Object.fromEntries(opts_chunk), keyOrObj);
            for (const k of Object.keys(keyOrObj)) {
                opts_chunk.set(k, keyOrObj[k]);
            }
        } else {
            opts_chunk.set(keyOrObj, val);
        }
    },
    get: (key) => opts_chunk.get(key)
};

const knit_hooks_api = {
    set: (name, fn) => knit_hooks.set(name, fn),
    get: (name) => knit_hooks.get(name)
};

export function engine_output(options, code, out) {
    return { options, code, out };
}
*/

// 修改後的 knitr.js
const knit_engines = new Map();
const opts_chunk = new Map();
const knit_hooks = new Map();

function engine_output(options, code, out) {
    return { options, code, out };
}

export {
    knit_engines,
    opts_chunk,
    knit_hooks,
    engine_output
};
