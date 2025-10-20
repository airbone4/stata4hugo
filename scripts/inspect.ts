import { convertMarkdownToIpynb } from '../src/converter';

(async () => {
  const md = `
1. first
2. second
10. tenth
`;
  const nb = await convertMarkdownToIpynb(md, undefined, { listStyle: 'pandoc' });
  console.log('---CELLS---');
  nb.cells.forEach((c:any,i:number)=>{
    console.log('CELL',i,c.cell_type);
    console.log('----');
    console.log(c.source);
    console.log('----');
  });
})();
