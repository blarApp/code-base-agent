from langchain_core.tools import BaseTool
from langchain.pydantic_v1 import BaseModel, Field
from typing import Optional, Type, List, Dict, Any
from langchain.callbacks.manager import CallbackManagerForToolRun
from blar_graph.agents.tools.BaseCypherModel import BaseCypherDatabaseTool


class KeywordInput(BaseModel):
    query: str = Field(description="Keyword to search for in the Neo4j database")


class KeywordSearchTool(BaseCypherDatabaseTool, BaseTool):
    name = "keword_search"
    description = (
        "Searches for a keyword in the path, name or node_id of the nodes in the Neo4j database"
    )
    args_schema: Type[BaseModel] = KeywordInput

    def _run(
        self, query: str, run_manager: Optional[CallbackManagerForToolRun] = None
    ) -> List[Dict[str, Any]]:
        """Returns a function code given a query that can be function name, path or node_id. returns the node text and the neighbors of the node."""
        code, neighbours= self.db_manager.get_code(query)
        res = f"current node code:\n {code['node.text']} \n\n current node neighbours: {neighbours}"

        return res
