capture program drop match
program define match,rclass
syntax anything

/*
local sectcode "ORTH" "PED" "CV" "GS" "GI" "OPH" ///
 "CM" "ENT" "GU" "NS" "GYN" "INF" "NEPH" "HM" "NEUR" ///
 "OBS" "CRS" "PS" "ESUR" "CVS" "GM" "EMED" "CS" "HEMA" "PSY" "MISC"
*/
local sectcode ORTH PED CV GS GI OPH CM ENT GU NS GYN INF NEPH HM NEUR ///
  OBS CRS PS ESUR CVS GM EMED CS HEMA PSY MISC
  
local sectlabel "骨科" "小兒科" "心臟內科" "一般外科" "胃腸科" "眼科" ///
 "胸腔內科" "耳鼻喉科" "泌尿外科" "急診神經外科" ///
 "婦科" "感染科" "腎臟科" "住院醫學科" "神經內科" ///
 "高危險妊娠暨產科" "大腸直腸外科" "整形外科" "外傷醫學科" ///
 "心臟外科" "一般內科" "急診醫學科" "胸腔外科" "血液腫瘤科" ///
 "精神科" "其他"

local idx : list posof `anything' in sectcode
local name :word `idx' of "`sectlabel'"
return local match="`name'"
end

