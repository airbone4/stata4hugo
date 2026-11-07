/*
example 
如果沒有指定 autoinc
. genfilename "xx", post(".docx")               
檔案名稱:xx_20200728_170034.docx
. genfilename "xx",pre("temp/")
檔案名稱:temp/xx_20200728_170034


example 指定 autoinc
. genfilename "hi", autoinc post(".do")
檔案名稱:hi_1.do

. genfilename "testok", autoinc post(".do")
檔案名稱:testok_1.do


 

*/
capture program drop genfilename
program define genfilename,rclass
syntax anything(everything),[pre(string)] [autoinc] [post(string)]
gettoken afile opargs : anything
//syntax  ,pre(string) [autoinc] [post(string)]


mata: st_local("base",pathbasename("`afile'"))
mata: _getpathparent("`afile'","path")

tempname cd ct cdt
if "`autoinc'"=="" {
  
  local `cd' : display %tdCCYY_NN_DD date(c(current_date), "DMY") //%tdCYND
  local `cd' = subinstr("``cd''", " ", "", .)
  local `ct' = c(current_time)
  local `ct' = subinstr("``ct''", ":", "", .)
  local `cdt' = "``cd''"+"_" +"``ct''"

  local `cdt' = "`pre'`base'"+"_"+"``cdt''"+"`post'"
}
else { //自動版本
  tempname go
  scalar `go' =1
  local `ct' 1
  while (`go'){   
    local `cdt' = "`pre'`base'"+"_"+"``ct''"+"`post'"
	capture confirm file "``cdt''"
	if _rc==0 {
	  
	  local `ct' = ``ct'' +1
	}
	else {
	  scalar `go'=0
	}
  }
  
}

di as txt "{p}檔案名稱:"  _c 
di as result "``cdt''{p_end}"
return local fn ``cdt''
return local fn2 "`pre'`base'`post'"
return local fn3 `="`pre'`base'"+"_"+"``ct''"'
return local base `="`base'"+"_"+"``ct''"'


end



cap mata: mata drop _getfileextension()
cap mata: mata drop _getpathparent()
mata:
//副檔名
void _getfileextension(string scalar path, 
	string scalar loc)
{
	string scalar p
	
	p = strtrim(strlower(pathsuffix(path)))
	st_local(loc, p) 
}
//路徑名稱
void _getpathparent( string scalar path, 
                     string scalar loc)
{
	string scalar p
	
	p = pathgetparent(path)  
	st_local(loc, p) 
}
end

