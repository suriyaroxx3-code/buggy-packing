// inventory.stock.jsx — Stock Management, backend API backed (SQLite persistent)
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Section, Stat, Field, inputCls, Btn, Pill } from "@/components/PageHelpers";
import { stockApi } from "@/lib/api";
import blisterCard from "@/assets/blister-card.webp";
import cardboardBoxes from "@/assets/cardboard boxes.avif";
import cardboardSheets from "@/assets/cardboard sheets-A4.avif";
import hotGlueSticks from "@/assets/hot glue sticks.jpg";
import plasticSleeves from "@/assets/plastic-sleeves.webp";
import printedLabels from "@/assets/Printed Labels-Roll.webp";
import sealingTape from "@/assets/Sealing Tape.jpg";
import { Plus, Search, Trash2, Edit2, Check, X } from "lucide-react";

export const Route = createFileRoute("/inventory/stock")({
  head: () => ({ meta: [{ title: "Inventory Stock — BrushPack" }] }),
  component: Page,
});

const CATS = ["All", "Cardboard", "Plastic", "Supplies"];

const EMPTY_FORM = { name: "", cat: "Cardboard", qty: "", unit: "pcs", min: "" };

const ITEM_IMAGES = [
  { match: /blister/i, src: blisterCard },
  { match: /cardboard boxes?/i, src: cardboardBoxes },
  { match: /cardboard sheets?/i, src: cardboardSheets },
  { match: /hot glue/i, src: hotGlueSticks },
  { match: /plastic sleeves?/i, src: plasticSleeves },
  { match: /printed labels?/i, src: printedLabels },
  { match: /sealing tape/i, src: sealingTape },
];

const itemImage = (name) => {
  const item = ITEM_IMAGES.find((i) => i.match.test(name));
  return item ? item.src : null;
};

function Page() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [cat, setCat]             = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty]     = useState("");
  const [addForm, setAddForm]     = useState(EMPTY_FORM);
  const [showAdd, setShowAdd]     = useState(false);
  const [toast, setToast]         = useState("");

  useEffect(() => {
    stockApi.getAll()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const filtered = items.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = cat === "All" || i.cat === cat;
    return matchSearch && matchCat;
  });

  const lowCount = items.filter((i) => i.qty < i.min).length;
  const totalVal = items.reduce((s, i) => s + i.qty, 0);

  /* Save quantity edit */
  const saveEdit = async (item) => {
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty < 0) { setEditingId(null); return; }
    try {
      const updated = await stockApi.update(item.id, { ...item, qty });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      setEditingId(null);
      showToast("✓ Quantity updated.");
    } catch (err) {
      alert("Failed to update: " + err.message);
    }
  };

  /* Delete item */
  const deleteItem = async (id) => {
    if (!confirm("Remove this item from inventory?")) return;
    try {
      await stockApi.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast("Item removed.");
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  /* Add new item */
  const handleAdd = async () => {
    if (!addForm.name.trim()) { alert("Item name is required."); return; }
    if (!addForm.qty)         { alert("Quantity is required."); return; }
    try {
      const created = await stockApi.create({
        name: addForm.name.trim(),
        cat:  addForm.cat,
        qty:  parseFloat(addForm.qty),
        unit: addForm.unit.trim() || "pcs",
        min:  parseFloat(addForm.min) || 0,
      });
      setItems((prev) => [...prev, created]);
      setAddForm(EMPTY_FORM);
      setShowAdd(false);
      showToast("✓ Item added to inventory.");
    } catch (err) {
      alert("Failed to add item: " + err.message);
    }
  };

  const stockStatus = (item) => {
    if (item.qty < item.min)         return "danger";
    if (item.qty < item.min * 1.3)   return "warn";
    return "success";
  };

  return (
    <DashboardLayout
      title="Stock"
      subtitle="Manage packaging materials and inventory levels."
      lowStockItems={items.filter((i) => i.qty < i.min)}
    >
      {/* Toast */}
      {toast && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700 font-medium animate-fade-in">
          ✓ {toast}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Stat label="Total Items" value={items.length}                    hint="In inventory" />
        <Stat label="Low Stock"   value={lowCount}                        hint="Need reorder" />
        <Stat label="Total Units" value={totalVal.toLocaleString()}       hint="Across all items" />
      </div>

      {/* Filters + Add */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 justify-between items-start sm:items-center flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                cat === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search items…"
              className={`${inputCls} pl-9 w-full sm:w-52`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Btn variant="accent" onClick={() => setShowAdd((s) => !s)}>
            <Plus className="h-4 w-4" /> {showAdd ? "Cancel" : "Add Item"}
          </Btn>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <>
          <Section title="Add Stock Item">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <Field label="Item Name">
                <input className={inputCls} placeholder="e.g. Cardboard Boxes" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
              </Field>
              <Field label="Category">
                <select className={inputCls} value={addForm.cat} onChange={(e) => setAddForm({ ...addForm, cat: e.target.value })}>
                  {["Cardboard", "Plastic", "Supplies"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Quantity">
                <input type="number" min="0" className={inputCls} value={addForm.qty} onChange={(e) => setAddForm({ ...addForm, qty: e.target.value })} />
              </Field>
              <Field label="Unit">
                <input className={inputCls} placeholder="pcs / sheets / rolls" value={addForm.unit} onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })} />
              </Field>
              <Field label="Min Threshold">
                <input type="number" min="0" className={inputCls} value={addForm.min} onChange={(e) => setAddForm({ ...addForm, min: e.target.value })} />
              </Field>
            </div>
            <div className="mt-4 flex gap-2">
              <Btn onClick={handleAdd}><Check className="h-4 w-4" /> Save Item</Btn>
              <Btn variant="ghost" onClick={() => { setShowAdd(false); setAddForm(EMPTY_FORM); }}>
                <X className="h-4 w-4" /> Cancel
              </Btn>
            </div>
          </Section>
          <div className="h-5" />
        </>
      )}

      {/* Table */}
      <Section title="Inventory">
        <div className="overflow-x-auto -mx-4 sm:-mx-6">
          <table className="w-full text-sm min-w-[580px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 sm:px-6 py-3">Item</th>
                <th className="px-4 sm:px-6 py-3">Category</th>
                <th className="px-4 sm:px-6 py-3">Quantity</th>
                <th className="px-4 sm:px-6 py-3">Minimum</th>
                <th className="px-4 sm:px-6 py-3">Status</th>
                <th className="px-4 sm:px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">Loading…</td>
                </tr>
              )}
              {!loading && filtered.map((item) => (
                <tr key={item.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30 transition">
                  <td className="px-4 sm:px-6 py-3 font-medium">
                    <div className="flex items-center gap-3">
                      {itemImage(item.name) && (
                        <img
                          src={itemImage(item.name)}
                          alt={item.name}
                          className="h-12 w-12 rounded-lg object-cover border border-border"
                        />
                      )}
                      <div>
                        {item.name}
                        <div className="text-xs text-muted-foreground">{item.unit}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-muted-foreground">{item.cat}</td>
                  <td className="px-4 sm:px-6 py-3">
                    {editingId === item.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min="0"
                          className={inputCls + " w-24"}
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(item); if (e.key === "Escape") setEditingId(null); }}
                        />
                        <button onClick={() => saveEdit(item)} className="text-primary hover:text-primary/80 p-1" title="Save">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-muted-foreground p-1" title="Cancel">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-medium">{item.qty.toLocaleString()} {item.unit}</span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-muted-foreground">{item.min.toLocaleString()} {item.unit}</td>
                  <td className="px-4 sm:px-6 py-3">
                    <Pill tone={stockStatus(item)}>
                      {item.qty < item.min ? "Low Stock" : item.qty < item.min * 1.3 ? "Monitor" : "OK"}
                    </Pill>
                  </td>
                  <td className="px-4 sm:px-6 py-3">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => { setEditingId(item.id); setEditQty(String(item.qty)); }}
                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition"
                        title="Edit quantity"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                        title="Remove item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">No items found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </DashboardLayout>
  );
}
