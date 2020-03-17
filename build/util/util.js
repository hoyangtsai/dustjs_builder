const k = new RegExp('[a-zA-Z-_0-9]+?V3.0D[0-9]+');

var getVersionAndModule = function(str){
  var result = "version err"
  try{
    result = k.exec(str)[0];
  }catch(e){}
  return result;
}

var getModule = function(str){
    return getVersionAndModule(str).split('_V3.0D')[0]
}

module.exports = {
  getVersionAndModule: getVersionAndModule,
  getModule : getModule
};