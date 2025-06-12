import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Grid, MenuItem, Alert } from '@mui/material';
import api from '../../services/api';

const categories = ['Genel', 'Spor', 'Tarih', 'Bilim', 'Eğlence'];

const AddBankQuestionDialog = ({ open, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    kategori: '',
    soru: '',
    secenek_a: '',
    secenek_b: '',
    secenek_c: '',
    secenek_d: '',
    dogru_sik: 'A'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError('');
    // Basic validation
    const { kategori, soru, secenek_a, secenek_b, secenek_c, secenek_d } = form;
    if(!kategori || !soru || !secenek_a || !secenek_b || !secenek_c || !secenek_d){
      setError('Lütfen tüm alanları doldurun');
      return;
    }
    setLoading(true);
    try{
      await api.post('/question-bank/add', form);
      if(onSuccess) onSuccess();
      onClose();
      // reset
      setForm({ kategori:'', soru:'', secenek_a:'', secenek_b:'', secenek_c:'', secenek_d:'', dogru_sik:'A'});
    }catch(err){
      setError(err.response?.data?.error || 'Ekleme başarısız');
    }finally{
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Soru Havuzuna Soru Ekle</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField select label="Kategori" fullWidth value={form.kategori} onChange={e=>handleChange('kategori',e.target.value)}>
              {categories.map(cat=>(<MenuItem key={cat} value={cat}>{cat}</MenuItem>))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField label="Soru" fullWidth multiline value={form.soru} onChange={e=>handleChange('soru',e.target.value)} />
          </Grid>
          {['A','B','C','D'].map((opt,idx)=>(
            <Grid item xs={12} md={6} key={opt}>
              <TextField label={`Seçenek ${opt}`} fullWidth value={form[`secenek_${opt.toLowerCase()}`]} onChange={e=>handleChange(`secenek_${opt.toLowerCase()}`,e.target.value)} />
            </Grid>
          ))}
          <Grid item xs={12}>
            <TextField select label="Doğru Şık" fullWidth value={form.dogru_sik} onChange={e=>handleChange('dogru_sik',e.target.value)}>
              {['A','B','C','D'].map(ch=>(<MenuItem key={ch} value={ch}>{ch}</MenuItem>))}
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>Kaydet</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddBankQuestionDialog; 