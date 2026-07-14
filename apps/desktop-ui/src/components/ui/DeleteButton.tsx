import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";

interface DeleteButtonProps {
  onDelete: () => void;
}

const DeleteButton: React.FC<DeleteButtonProps> = ({ onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Open the dialog
  const handleDeleteClick = () => {
    setIsOpen(true);
  };

  // Close the dialog
  const handleCancel = () => {
    setIsOpen(false);
  };

  // Confirm deletion
  const handleConfirm = () => {
    onDelete(); // Execute the deletion function
    setIsOpen(false); // Close the dialog
  };

  return (
    <>
      {/* Delete Icon/Button */}
      <button onClick={handleDeleteClick} className="text-red-500 hover:text-red-700">
      <Trash2 className="h-4 w-4 text-red-500" />
      </button>

      {/* Confirmation Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you sure you want to delete this item?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteButton;