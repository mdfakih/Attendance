'use client';

import { forwardRef, useState } from 'react';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';

/** Password input with a show/hide button. */
export const PasswordField = forwardRef<HTMLInputElement, TextFieldProps>(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      inputRef={ref}
      type={visible ? 'text' : 'password'}
      slotProps={{
        ...props.slotProps,
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" edge="end" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>
                {visible ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
});
