import { route } from "@/lib/api";
import { deleteTask, updateTask } from "@/lib/repo";
import { TaskBody } from "@/lib/schemas";

export const PATCH = route<{ id: string }>(async ({ req, userId, params }) => {
  const body = TaskBody.partial().parse(await req.json());
  const task = await updateTask(userId, params.id, body);
  return task ? Response.json({ task }) : Response.json({ error: "Not found" }, { status: 404 });
});

export const DELETE = route<{ id: string }>(async ({ userId, params }) => {
  await deleteTask(userId, params.id);
  return new Response(null, { status: 204 });
});
