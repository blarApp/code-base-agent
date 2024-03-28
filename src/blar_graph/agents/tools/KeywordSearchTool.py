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
        "Searches for a keyword in the path and name of the nodes in the Neo4j database"
    )
    args_schema: Type[BaseModel] = KeywordInput

    def _run(
        self, query: str, run_manager: Optional[CallbackManagerForToolRun] = None
    ) -> List[Dict[str, Any]]:
        """Searches for this keyword in a Neo4j database, and returns a list of matching code pieces with their relevance scores. The keyword could be a path (without the file format), function name or node_id."""
        results = self.db_manager.get_code(query)
        return results
