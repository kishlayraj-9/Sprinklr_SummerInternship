//export const parser = 'babel'

function wrap_with_css(j, root, name){

	return root
  .find(j.VariableDeclarator,{
    id:{
      name: name
    }})
  .filter(path =>{
    if(path.node.init.type == 'TemplateLiteral'){
      return path;
    }
  })
  .forEach(path => {
    const taggedTemplate = j.taggedTemplateExpression(
      j.identifier('css'), 
      path.node.init,
    );
    path.node.init = taggedTemplate;
    
    path.node.init.quasi.expressions.map((x) => {
      wrap_with_css(j, root, x.name);
    }); 	
  })
  .toSource();
}

export default function transformer1(file, api) {
	const j = api.jscodeshift;
  	const root = j(file.source)
  
    return root
    .find(j.JSXOpeningElement,{
     name:{
        name: 'Global'
     }})
  	.filter(path => {
     	if(path.node.attributes[0].name.name == 'styles' && path.node.attributes[0].value.expression.type == 'TaggedTemplateExpression'){
          return path;
      }
    })
    .forEach(path => {
      path.value.attributes[0].value.expression.quasi.expressions.map((x) =>{
        wrap_with_css(j,root,x.name);
      })                                                                
    })
    .toSource();  
}
