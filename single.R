# 經驗報告
# 執行的時候,工作目錄在專案根目錄,.profile也有讀入
local({

  #source("themes/variant/utils/r/hugoup.r",environment(),encoding="UTF-8")

  #infile <-"content\\r\\engine\\knitr自訂輸出.Rmarkdown"
  # infile<-"content\\r\\engine\\純測試.Rmarkdown"  
  infile <- commandArgs(TRUE)
  source("themes/variant/utils/r/onepage.r",environment(),encoding="UTF-8")


},new.env())