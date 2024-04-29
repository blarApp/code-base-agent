from typing import Any, Dict, List, Optional, Type

from langchain.callbacks.manager import CallbackManagerForToolRun
from langchain.pydantic_v1 import BaseModel, Field
from langchain_core.tools import BaseTool

from blar_graph.agents_tools.tools.BaseCypherModel import BaseCypherDatabaseTool


class KeywordInput(BaseModel):
    query: str = Field(description="Keyword to search for in the Neo4j database")


class KeywordSearchTool(BaseCypherDatabaseTool, BaseTool):
    name = "keyword_search"
    description = "Searches for a keyword in the path, name or node_id of the nodes in the Neo4j database"
    args_schema: Type[BaseModel] = KeywordInput

    def _run(self, query: str, run_manager: Optional[CallbackManagerForToolRun] = None) -> List[Dict[str, Any]]:
        """Returns a function code given a query that can be function name, path or node_id. returns the best matches."""
        result = self.db_manager.search_code(query)

        if not result:
            return "No code found for the given query"
        result = result if result else "No result found"

        return result
