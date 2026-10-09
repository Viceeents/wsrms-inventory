export default function MemberAvatar({ name, image }) {
  return (
    <span className="member-avatar" aria-hidden="true">
      {image ? (
        <img src={image} alt="" />
      ) : (
        (name || "Storix")
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase()
      )}
    </span>
  );
}
