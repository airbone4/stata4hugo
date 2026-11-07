capture program drop estmtx
program define estmtx
 
syntax [using],[matrix(name) varlabels(string) *]

estout matrix(`matrix')  `using', ///
  varwidth(12)  ///
  modelwidth(12)  ///
  mlabels(none) ///
  begin("<tr><td>") ///
  delimiter("</td><td>") ///
  end("</td></tr>")  ///
  prehead(`"<table border="0" width="*">"' `"<thead>"') ///
  posthead(`"</thead><tbody> "') ///
  postfoot(`"</tbody></table>"') ///
///  varlabels(r1 "替換" ) ///
///  eqlabels(, begin("<tr><td colspan=@span><hr></td></tr>" "") nofirst) ///
  interaction(" # ") ///
///  level(95) ///  
  style(html)  ///
  `options'   
 end  

//`"`macval(options)'"' 