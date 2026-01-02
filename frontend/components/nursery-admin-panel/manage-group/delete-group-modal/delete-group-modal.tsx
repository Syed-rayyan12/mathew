import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";


export function DeleteGroupModal({ open, onClose, data, onConfirmDelete }: any) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-4">
        <DialogHeader>
          <DialogTitle>Delete Group</DialogTitle>
        </DialogHeader>

        <p>Are you sure you want to delete this "group"<b>{data?.groupName}</b>?</p>

        <DialogFooter>
        <Button variant="outline" className="cursor-pointer" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirmDelete} className="bg-red-600 cursor-pointer text-white hover:bg-red-700">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
