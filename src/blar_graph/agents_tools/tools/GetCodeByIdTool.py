from typing import Any, Dict, List, Optional, Type

from langchain.callbacks.manager import CallbackManagerForToolRun
from langchain.pydantic_v1 import BaseModel, Field
from langchain_core.tools import BaseTool

from blar_graph.agents_tools.tools.BaseCypherModel import BaseCypherDatabaseTool


class NodeIdInput(BaseModel):
    query: str = Field(description="node_id to search for in the Neo4j database")


class GetCodeByIdTool(BaseCypherDatabaseTool, BaseTool):
    name = "get_code_by_id"
    description = "Searches for node by id in the Neo4j database"

    args_schema: Type[BaseModel] = NodeIdInput

    def _run(self, query: str, run_manager: Optional[CallbackManagerForToolRun] = None) -> List[Dict[str, Any]]:
        """Returns a function code given a node_id. returns the node text and the neighbors of the node."""
        code, neighbours = self.db_manager.get_node_by_id(query)
        if not code:
            return "No code found for the given query"
        res = f"current node code:\n {code['text']} \n\n current node neighbours: {neighbours}"

        return res
