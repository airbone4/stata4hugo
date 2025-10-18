---
title: "Test Document"
author: "Test User"
date: "2025-10-17"
---

<!--more-->




```python
library(Statamarkdown)
knitr::opts_chunk$set(cleanlog = F)

```


```python
%%stata
adopath + ".."
adopath + "../utils/"
set linesize 255

```

## 設定stata




```python
import stata_setup,
stata_setup.config("C:/Program Files/Stata18/", "mp")

```

# Test Markdown to Notebook Conversion

Regular markdown paragraph.

## Code Cells

R code:




```python
x <- rnorm(100)
mean(x)

```

Stata code:




```python
%%stata
sysuse auto
summarize price

```

R with options:




```python
plot(x)

```

## Lists and Text

 - 
 - 

 - 
 - 


