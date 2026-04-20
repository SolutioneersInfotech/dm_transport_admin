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
  const restOptions = { ...options };
  delete restOptions.staleTime;
  delete restOptions.refetchOnWindowFocus;
  delete restOptions.refetchOnReconnect;

  return useQuery({
    queryKey: ["chat-list"],
    queryFn: fetchUsersForChat,
    ...restOptions,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useChatMessagesQuery(chatTarget, options = {}) {
  const chatTargetKey = resolveChatTargetKey(chatTarget);
  const optionsEnabled = options.enabled;
  const restOptions = { ...options };
  delete restOptions.enabled;
  delete restOptions.staleTime;
  delete restOptions.refetchOnWindowFocus;
  delete restOptions.refetchOnReconnect;

  return useQuery({
    queryKey: ["chat-messages", chatTargetKey],
    queryFn: () => fetchMessages(chatTarget, 200),
    ...restOptions,
    enabled: Boolean(chatTargetKey) && (optionsEnabled ?? true),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
