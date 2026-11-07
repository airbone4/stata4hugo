/*
hugocmd quote,hbody("N area") autoend
hugocmd quote,hbody(`" . lp(par(`"["' )) &up(par(`","' `"]"' )) "') autoend
*/
capture program drop hugocmd
program define hugocmd
syntax anything,[hargs(string) hbody(string) autoend end *]
if "`end'"!="" {
  disp "{{< /`anything' >}}" 
}
else {
  local cmdstr {{< `anything' `macval(hbody)' >}}  
  if "`autoend'"=="autoend"{
    disp `"`cmdstr' {{< /`anything' >}}"' 
  }
  else {
    disp `"`cmdstr'"' 
  }
 
} 
end