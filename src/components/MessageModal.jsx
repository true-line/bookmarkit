import React from "react";
import { Button, Modal } from "../design-system/index.js";
import Banner from "./Banner.jsx";

// #243: the unified design system's modal-standard — divided header, tinted
// footer band, the tonal bordered Close. Focus trap, Escape, and focus
// restoration come from the unified Modal's useFocusTrap (A11Y-04, PERF-05:
// live region announcement and React.memo). The Banner is the standalone app
// component re-homed when the legacy library retired (#255); the shell is
// what migrated.
const MessageModal = ({ message, type = "info", onClose }) => {
  return (
    <Modal
      title={type === "success" ? "Success!" : type === "error" ? "Error!" : "Information"}
      onClose={onClose}
      footer={
        <Button intent="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <Banner tone={type === "error" ? "error" : type}>{message}</Banner>
    </Modal>
  );
};

export default React.memo(MessageModal);
