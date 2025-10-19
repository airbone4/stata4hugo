---
title: "Test Document"
author: "Test User"
date: "2025-10-17"
---

<!--more-->

```r
library(Statamarkdown)
knitr::opts_chunk$set(cleanlog = F)
```

```stata
adopath + ".."
adopath + "../utils/"
set linesize 255
```

## 設定stata

```python
import stata_setup,
stata_setup.config("C:/Program Files/Stata18/", "mp")
```

```python
#這裡是普通的fenced block code
```

這裡是分隔帶

```stata
// 這裡也是普通段落
```

# Test Markdown to Notebook Conversion

Regular markdown paragraph.

## Code Cells

R code:

```r
x <- rnorm(100)
mean(x)
```

Stata code:

```stata
sysuse auto
summarize price
```

R with options:

```r
plot(x)
```

## Lists and Text

 - 
 - 

 - 
 -
