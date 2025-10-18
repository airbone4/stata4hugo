#"resources/b12 div ex1.html"
addRawHtmlDemo <-function(filePath) {
  txt<-readLines(filePath,encoding = "UTF-8", warn=FALSE)
  txt<-paste(txt,collapse="\n")
  #txt<-paste("\`\`\`html",txt,"\`\`\`",sep="\n")
  txt<-wrapTxt(txt,"\`\`\`html","\`\`\`")
  #txt<-wrapTxt(txt,"<div contenteditable='true'>","</div>")
  #iframe 模板
  template<-paste0('{{% html_demo filePath="',filePath,'" %}} ')
  txt<-paste(txt,template,sep="\n")
  cat(txt)  
}
 
wrapTxt<-function(content,btag,etag){
  return( paste(btag,content,etag,sep="\n"))
}