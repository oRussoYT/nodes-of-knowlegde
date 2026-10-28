import { createClient } from "@/lib/supabase/server";

import { isNodeSlug, parseMyNodes, parseNodeDetail, parseNodeList, type MyNode, type NodeDetail, type NodeSummary } from "./parse";

export async function listNodes(): Promise<NodeSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_nodes");
  return error ? [] : parseNodeList(data);
}

export async function getNode(slug: string): Promise<NodeDetail | null> {
  if (!isNodeSlug(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_node", { p_slug: slug });
  return error ? null : parseNodeDetail(data);
}

export async function getMyNodes(): Promise<MyNode[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_nodes");
  return error ? [] : parseMyNodes(data);
}
