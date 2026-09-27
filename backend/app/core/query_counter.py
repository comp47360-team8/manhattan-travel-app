from contextvars import ContextVar
from app.database import engine
from sqlalchemy import event


query_count:ContextVar[list[int]|None] = ContextVar("query_count", default=None)



def _count(conn, cursor, statement, parameters, context, executemany):
  counter = query_count.get()
  if counter is not None:
    counter[0]+=1


def register_query_counter(app):
  event.listen(engine, "before_cursor_execute", _count)

  @app.middleware("http")
  async def count_queries(request, call_next):
    counter = [0]
    query_count.set(counter)
    response = await call_next(request)
    response.headers["X-Query-Count"] = str(counter[0])
    return response