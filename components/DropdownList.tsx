"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

const DropdownList = ({
  options,
  selectedOption,
  onOptionSelect,
  triggerElement,
}: DropdownListProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOptionClick = (option: string) => {
    onOptionSelect(option);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        {triggerElement}
      </div>

      {isOpen && (
        <ul className="dropdown">
          {options.map((option) => (
            <li
              key={option}
              className={cn("list-item", {
                "bg-sky-100 text-white": selectedOption === option,
              })}
              onClick={() => handleOptionClick(option)}
            >
              {option}
              {selectedOption === option && <CheckIcon className="w-4 h-4" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DropdownList;
