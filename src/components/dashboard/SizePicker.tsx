import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LETTER_SIZES, NUMBER_SIZES } from "@/lib/store-sizes";

export function SizePicker({ value, onChange }: { value: string[]; onChange: (sizes: string[]) => void }) {
  const [mode, setMode] = useState("letters");
  const [custom, setCustom] = useState("");
  const options = mode === "letters" ? LETTER_SIZES : NUMBER_SIZES;
  const extras = value.filter((s) => !LETTER_SIZES.includes(s) && !NUMBER_SIZES.includes(s));
  const all = options.every((s) => value.includes(s));
  const toggle = (size: string, checked: boolean) => onChange(checked ? [...new Set([...value, size])] : value.filter((s) => s !== size));
  const addCustom = () => {
    const size = custom.trim();
    if (!size) return;
    toggle(size, true);
    setCustom("");
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full min-w-0 justify-between" aria-label="اختيار المقاسات">
          <span className="truncate">{value.length ? value.join("، ") : "المقاسات (اختياري)"}</span>
          <ChevronDown className="size-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 max-w-[calc(100vw-2rem)] space-y-3" dir="rtl" align="start">
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="w-full">
            <TabsTrigger value="letters" className="flex-1">حروف</TabsTrigger>
            <TabsTrigger value="numbers" className="flex-1">أرقام</TabsTrigger>
          </TabsList>
        </Tabs>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={all ? true : options.some((s) => value.includes(s)) ? "indeterminate" : false}
            onCheckedChange={(checked) => onChange(checked === true ? [...new Set([...value, ...options])] : value.filter((s) => !options.includes(s)))} />
          اختيار الكل
        </label>
        <div className="grid grid-cols-3 gap-3" dir="ltr">
          {[...options, ...extras].map((size) => (
            <label key={size} className="flex items-center gap-2 text-sm">
              <Checkbox checked={value.includes(size)} onCheckedChange={(checked) => toggle(size, checked === true)} />
              {size}
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Input aria-label="مقاس آخر" placeholder="مقاس آخر" value={custom} onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }} />
          <Button variant="outline" size="icon" aria-label="إضافة مقاس آخر" onClick={addCustom}><Plus className="size-4" /></Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onChange([])} disabled={!value.length}>بدون مقاس</Button>
      </PopoverContent>
    </Popover>
  );
}