const knit_engines = {};
const opts_chunk = {};
const knit_hooks = {};
function engine_output(options, code, out) {
    return { options, code, out };
}
export  {
    knit_engines,    opts_chunk,  knit_hooks,  engine_output
};