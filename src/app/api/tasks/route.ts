import { route } from "@/lib/api";
import { createTask, listTasks } from "@/lib/repo";
import { TaskBody } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = route(async ({ userId }) => Response.json({ tasks: await listTasks(userId) }));

export const POST = route(async ({ req, userId }) => {
  const body = TaskBody.parse(await req.json());
  return Response.json({ task: await createTask(userId, body) }, { status: 201 });
});
