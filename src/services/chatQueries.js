import { useQuery } from "@tanstack/react-query";
import { fetchMessages, fetchUsersForChat } from "./chatAPI";

function resolveChatTargetKey(chatTarget) {
  if (!chatTarget) return null;

  if (typeof chatTarget === "object") {
    return (
      chatTarget.userid ??
      chatTarget.userId ??
      chatTarget.contactId ??
      chatTarget.contactid ??
      chatTarget.uid ??
      chatTarget.id ??
      null
    );
  }

  return chatTarget;
}

export function useChatListQuery(options = {}) {
  return useQuery({
    queryKey: ["chat-list"],
    queryFn: fetchUsersForChat,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    ...options,
  });
}

export function useChatMessagesQuery(chatTarget, options = {}) {
  const chatTargetKey = resolveChatTargetKey(chatTarget);

  return useQuery({
    queryKey: ["chat-messages", chatTargetKey],
    queryFn: () => fetchMessages(chatTarget, 200),
    enabled: Boolean(chatTargetKey),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    ...options,
  });
}
