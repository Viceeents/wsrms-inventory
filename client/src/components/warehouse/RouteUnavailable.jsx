import Modal from "../common/Modal";
import Button from "../common/Button";
export default function RouteUnavailable({ message, onClose }) {
  return message ? (
    <Modal title="Route unavailable" onClose={onClose}>
      <p>The selected destination cannot currently be reached.</p>
      <p className="muted mt-4">
        Check for blocked paths, inaccessible storage, or warehouse layout
        configuration.
      </p>
      <div className="form-footer">
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>
  ) : null;
}
