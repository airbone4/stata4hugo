@echo off
echo %1
echo %2
set _filename=%~n1
set _extension=%~x1
rem echo %_filename%
rem echo %_extension%

set kind="Nomatch"
if /I %_extension%==.Rmarkdown (set kind="rmd")
if /I %_extension%==.rmd (set kind="rmd")
if /I %_extension%==.ipynb (set kind="ipynb")

if %kind%=="rmd" (rscript --encoding=UTF-8 single.r %1)
if %kind%=="ipynb" (
%2 -m jupyter nbconvert %1 --to markdown --NbConvertApp.output_files_dir="%_filename%.files" 
)

if %kind%=="Nomatch" (echo unknown file type)