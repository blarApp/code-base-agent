from langchain.pydantic_v1 import BaseModel, Field
from blar_graph.graph_construction.neo4j_manager import Neo4jManager
from langchain_core.tools import BaseTool


class BaseCypherDatabaseTool(BaseModel):
    """Base tool for interacting with a Graph database."""

    db_manager: Neo4jManager = Field(exclude=True)

    class Config(BaseTool.Config):
        pass
