export function groupMessagesByDate(messages) {
  const groups = {};

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  messages.forEach((msg) => {
    const msgDateObj = new Date(msg.dateTime);
    const msgDateStr = msgDateObj.toDateString();

    let label = "";

    if (msgDateStr === today.toDateString()) {
      label = "Today";
    } else if (msgDateStr === yesterday.toDateString()) {
      label = "Yesterday";
    } else {
      label = msgDateObj.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(msg);
  });

  return groups;
}
