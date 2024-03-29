from langchain.pydantic_v1 import BaseModel, Field
from blar_graph.db_managers.base_manager import BaseDBManager
from langchain_core.tools import BaseTool


class BaseCypherDatabaseTool(BaseModel):
    """Base tool for interacting with a Graph database."""

    db_manager: BaseDBManager = Field(exclude=True)

    class Config(BaseTool.Config):
        pass
