from llama_index.core import SimpleDirectoryReader
from llama_index.core.text_splitter import CodeSplitter
from llama_index.llms.openai import OpenAI
from llama_index.packs.code_hierarchy import CodeHierarchyNodeParser
from llama_index.core.schema import NodeRelationship
from neo4j_manager import Neo4jManager
from pathlib import Path

class GraphConstructor:
  NODES_NAME_MAP = {
    'file': 'FILE',
    'function_definition': 'FUNCTION',
    'class_definition': 'CLASS',
  }

  RELATIONS_TYPES_MAP = {
    'function_definition': 'FUNCTION_DEFINITION',
    'class_definition': 'CLASS_DEFINITION',
  }

  def __init__(self, graph_manager: Neo4jManager):
    self.graph_manager = graph_manager
  
  def __process_node__(self, node):
    is_parent_node = False
    relationships = []
    for relation in node.relationships.items():
      if relation[0] == NodeRelationship.CHILD:
        for child in relation[1]:
          relation_type = child.metadata['inclusive_scopes'][0]['type'] if child.metadata['inclusive_scopes'] else ''
          relationships.append({'sourceId': node.node_id, 'targetId': child.node_id, 'type': self.RELATIONS_TYPES_MAP.get(relation_type, 'UNKNOWN')})
      elif relation[0] == NodeRelationship.PARENT:
        if relation[1] is None:
          is_parent_node = True

    typeNode = 'file' if is_parent_node else node.metadata['inclusive_scopes'][0]['type'] if node.metadata['inclusive_scopes'] else ''
    
    processed_node = {
      'type': self.NODES_NAME_MAP.get(typeNode, 'UNKNOWN'),
      'attributes': {
        'language': node.metadata['language'],
        'name': node.metadata['language'],
        'text': node.text,
        'node_id': node.node_id,
      },
    }
    return processed_node, relationships

  def process_file(self, file_path, languaje):
    path = Path(file_path)
    if not path.exists():
      print(f'File {file_path} does not exist.')
      return
    documents = SimpleDirectoryReader(
      input_files=[path],
      file_metadata=lambda x: {'filepath': x},
    ).load_data()

    code = CodeHierarchyNodeParser(
      language=languaje,
      chunk_min_characters=3,
      code_splitter=CodeSplitter(language=languaje, max_chars=1000, chunk_lines=10),
    )

    split_nodes = code.get_nodes_from_documents(documents)
    node_list = []
    edges_list = []
    for node in split_nodes:
      processed_node, relationships = self.__process_node__(node)
      node_list.append(processed_node)
      edges_list.extend(relationships)

    self.graph_manager.create_nodes(node_list)
    self.graph_manager.create_edges(edges_list)

if __name__ == '__main__':
  graph_manager = Neo4jManager()
  graph_constructor = GraphConstructor(graph_manager)
  graph_constructor.process_file('src/test_documents/test.py', 'python')
  graph_manager.close()
